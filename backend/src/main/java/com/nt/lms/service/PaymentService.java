package com.nt.lms.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nt.lms.dto.response.PaymentResponse;
import com.nt.lms.entity.Course;
import com.nt.lms.entity.Enrollment;
import com.nt.lms.entity.Payment;
import com.nt.lms.entity.User;
import com.nt.lms.enums.EnrollmentStatus;
import com.nt.lms.enums.PaymentStatus;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.repository.CourseRepository;
import com.nt.lms.repository.EnrollmentRepository;
import com.nt.lms.repository.PaymentRepository;
import com.nt.lms.repository.UserRepository;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ObjectMapper objectMapper;

    @Value("${lms.payment.sepay.bank-code:TPB}")
    private String bankCode;

    @Value("${lms.payment.sepay.bank-name:TPBank}")
    private String bankName;

    @Value("${lms.payment.sepay.account-number:88826062004}")
    private String accountNumber;

    @Value("${lms.payment.sepay.account-name:NGUYEN TAT THANG}")
    private String accountName;

    @Value("${lms.payment.sepay.payment-prefix:LMS}")
    private String paymentPrefix;

    @Value("${lms.payment.sepay.webhook-api-key:}")
    private String webhookApiKey;

    @Value("${lms.payment.sepay.webhook-secret:}")
    private String webhookSecret;

    @Transactional
    public PaymentResponse createCoursePayment(String courseId) {
        User user = getCurrentUser();
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));

        if (enrollmentRepository.existsByUserIdAndCourseId(user.getId(), course.getId())) {
            throw new AppException(ErrorCode.ALREADY_ENROLLED);
        }

        if (!requiresPayment(course)) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        Payment payment = paymentRepository
                .findFirstByUserIdAndCourseIdAndStatusOrderByCreatedAtDesc(
                        user.getId(), course.getId(), PaymentStatus.PENDING)
                .map(existingPayment -> refreshPendingPayment(existingPayment, course))
                .orElseGet(() -> createPendingPayment(user, course));

        return toResponse(payment);
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPayment(String paymentId) {
        User user = getCurrentUser();
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        boolean isAdmin = user.getRoles() != null
                && user.getRoles().stream().anyMatch(role -> "ADMIN".equals(role.getName()));
        if (!isAdmin && (payment.getUser() == null || !user.getId().equals(payment.getUser().getId()))) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        return toResponse(payment);
    }

    @Transactional
    public void handleSepayWebhook(String rawBody, String authorization, String signature, String timestamp) {
        log.info("Received SePay webhook");
        verifyWebhook(rawBody, authorization, signature, timestamp);

        JsonNode payload = parsePayload(rawBody);
        String transferType = text(payload, "transferType");
        if (!"in".equalsIgnoreCase(transferType)) {
            log.info("Ignored SePay webhook because transferType={}", transferType);
            return;
        }

        String transactionId = text(payload, "id");
        if (transactionId != null && paymentRepository.existsBySepayTransactionId(transactionId)) {
            return;
        }

        String paymentCode = firstNonBlank(text(payload, "code"), findPaymentCode(text(payload, "content")));
        if (paymentCode == null) {
            log.warn("SePay webhook missing payment code. content={}", text(payload, "content"));
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing payment code");
        }
        log.info("SePay webhook paymentCode={}, amount={}, ref={}",
                paymentCode, text(payload, "transferAmount"), text(payload, "referenceCode"));

        Payment payment = paymentRepository.findByPaymentCode(paymentCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));

        if (payment.getStatus() == PaymentStatus.PAID) {
            return;
        }

        BigDecimal transferAmount = decimal(payload, "transferAmount");
        if (transferAmount == null || transferAmount.compareTo(payment.getAmount()) < 0) {
            log.warn("SePay amount invalid for paymentCode={}. expected={}, received={}",
                    paymentCode, payment.getAmount(), transferAmount);
            payment.setStatus(PaymentStatus.FAILED);
            payment.setPaidContent(text(payload, "content"));
            paymentRepository.save(payment);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid payment amount");
        }

        payment.setStatus(PaymentStatus.PAID);
        payment.setSepayTransactionId(transactionId);
        payment.setReferenceCode(text(payload, "referenceCode"));
        payment.setPaidContent(text(payload, "content"));
        payment.setPaidAt(LocalDateTime.now());
        paymentRepository.save(payment);

        createEnrollmentIfNeeded(payment);
        log.info("Payment {} marked PAID and enrollment is active", paymentCode);
    }

    private Payment createPendingPayment(User user, Course course) {
        String paymentCode = generatePaymentCode();
        Payment payment = Payment.builder()
                .paymentCode(paymentCode)
                .user(user)
                .course(course)
                .amount(course.getPrice())
                .currency(course.getCurrency() == null ? "VND" : course.getCurrency())
                .provider("SEPAY")
                .status(PaymentStatus.PENDING)
                .bankCode(bankCode)
                .bankName(bankName)
                .accountNumber(accountNumber)
                .accountName(accountName)
                .createdAt(LocalDateTime.now())
                .build();
        payment.setQrUrl(buildQrUrl(payment));
        return paymentRepository.save(payment);
    }

    private Payment refreshPendingPayment(Payment payment, Course course) {
        payment.setAmount(course.getPrice());
        payment.setCurrency(course.getCurrency() == null ? "VND" : course.getCurrency());
        payment.setProvider("SEPAY");
        payment.setBankCode(bankCode);
        payment.setBankName(bankName);
        payment.setAccountNumber(accountNumber);
        payment.setAccountName(accountName);
        payment.setQrUrl(buildQrUrl(payment));
        return paymentRepository.save(payment);
    }

    private void createEnrollmentIfNeeded(Payment payment) {
        if (enrollmentRepository.existsByUserIdAndCourseId(
                payment.getUser().getId(), payment.getCourse().getId())) {
            return;
        }

        enrollmentRepository.save(Enrollment.builder()
                .user(payment.getUser())
                .course(payment.getCourse())
                .status(EnrollmentStatus.ACTIVE)
                .progressPercent(0.0)
                .enrolledAt(LocalDateTime.now())
                .lastAccessedAt(null)
                .build());
    }

    private void verifyWebhook(String rawBody, String authorization, String signature, String timestamp) {
        if (webhookSecret != null && !webhookSecret.isBlank()) {
            verifyHmac(rawBody, signature, timestamp);
            return;
        }

        if (webhookApiKey != null && !webhookApiKey.isBlank()) {
            String expected = "Apikey " + webhookApiKey;
            boolean validApiKey = authorization != null
                    && (secureEquals(expected, authorization)
                            || secureEquals(webhookApiKey, authorization)
                            || secureEquals("Bearer " + webhookApiKey, authorization));
            if (!validApiKey) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid SePay API key");
            }
        }
    }

    private boolean secureEquals(String expected, String actual) {
        return expected != null
                && actual != null
                && MessageDigest.isEqual(
                        expected.getBytes(StandardCharsets.UTF_8),
                        actual.getBytes(StandardCharsets.UTF_8));
    }

    private void verifyHmac(String rawBody, String signature, String timestamp) {
        if (signature == null || timestamp == null || timestamp.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing SePay signature");
        }

        long signedAt;
        try {
            signedAt = Long.parseLong(timestamp);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid SePay timestamp");
        }

        if (Math.abs(Instant.now().getEpochSecond() - signedAt) > 300) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Expired SePay webhook");
        }

        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal((timestamp + "." + rawBody).getBytes(StandardCharsets.UTF_8));
            String expectedHex = HexFormat.of().formatHex(digest);
            String expected = signature.startsWith("sha256=") ? "sha256=" + expectedHex : expectedHex;

            if (!MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.UTF_8),
                    signature.getBytes(StandardCharsets.UTF_8))) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid SePay signature");
            }
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Cannot verify SePay signature");
        }
    }

    private JsonNode parsePayload(String rawBody) {
        try {
            return objectMapper.readTree(rawBody);
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid SePay payload");
        }
    }

    private String buildQrUrl(Payment payment) {
        String addInfo = encode(payment.getPaymentCode());
        String encodedName = encode(payment.getAccountName());
        String amount = String.valueOf(payment.getAmount().longValue());
        return "https://img.vietqr.io/image/"
                + payment.getBankCode()
                + "-"
                + payment.getAccountNumber()
                + "-compact2.png?amount="
                + amount
                + "&addInfo="
                + addInfo
                + "&accountName="
                + encodedName;
    }

    private PaymentResponse toResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .paymentCode(payment.getPaymentCode())
                .courseId(payment.getCourse() != null ? payment.getCourse().getId() : null)
                .courseTitle(payment.getCourse() != null ? payment.getCourse().getTitle() : null)
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .status(payment.getStatus() != null ? payment.getStatus().name() : null)
                .provider(payment.getProvider())
                .bankCode(payment.getBankCode())
                .bankName(payment.getBankName())
                .accountNumber(payment.getAccountNumber())
                .accountName(payment.getAccountName())
                .qrUrl(payment.getQrUrl())
                .createdAt(payment.getCreatedAt())
                .paidAt(payment.getPaidAt())
                .build();
    }

    private boolean requiresPayment(Course course) {
        return Boolean.TRUE.equals(course.getPaid())
                && course.getPrice() != null
                && course.getPrice().compareTo(BigDecimal.ZERO) > 0;
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    private String generatePaymentCode() {
        return paymentPrefix.trim().toUpperCase()
                + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
    }

    private String findPaymentCode(String content) {
        if (content == null || content.isBlank()) {
            return null;
        }
        String upperContent = content.toUpperCase();
        String prefix = paymentPrefix.trim().toUpperCase();
        int index = upperContent.indexOf(prefix);
        if (index < 0) {
            return null;
        }
        int end = index;
        while (end < upperContent.length() && Character.isLetterOrDigit(upperContent.charAt(end))) {
            end++;
        }
        return upperContent.substring(index, end);
    }

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first.trim().toUpperCase();
        }
        if (second != null && !second.isBlank()) {
            return second.trim().toUpperCase();
        }
        return null;
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        return value.asText();
    }

    private BigDecimal decimal(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        return value.decimalValue();
    }

    private String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }
}
