package com.nt.lms.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nt.lms.dto.response.PaymentResponse;
import com.nt.lms.dto.response.PaymentTransactionResponse;
import com.nt.lms.dto.response.PageResponse;
import com.nt.lms.dto.response.RevenueCourseStatResponse;
import com.nt.lms.dto.response.RevenueDashboardResponse;
import com.nt.lms.dto.response.RevenueStatusStatResponse;
import com.nt.lms.dto.response.RevenueTrendPointResponse;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
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
    private final AppNotificationService appNotificationService;

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

    @Value("${lms.payment.pending-expire-minutes:30}")
    private long pendingExpireMinutes;

    @Transactional
    public PaymentResponse createCoursePayment(String courseId) {
        expireStalePendingPayments();

        User user = getCurrentUser();
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));

        if (enrollmentRepository.existsByUserIdAndCourseId(user.getId(), course.getId())) {
            throw new AppException(ErrorCode.ALREADY_ENROLLED);
        }

        if (!requiresPayment(course)) {
            throw new AppException(
                    ErrorCode.INVALID_REQUEST,
                    "Khóa học này chưa có giá thanh toán hợp lệ.");
        }

        validateSepayConfig();

        Payment payment = paymentRepository
                .findFirstByUserIdAndCourseIdAndStatusOrderByCreatedAtDesc(
                        user.getId(), course.getId(), PaymentStatus.PENDING)
                .map(existingPayment -> refreshPendingPayment(existingPayment, course))
                .orElseGet(() -> createPendingPayment(user, course));

        return toResponse(payment);
    }

    @Transactional
    public PaymentResponse getPayment(String paymentId) {
        expireStalePendingPayments();

        User user = getCurrentUser();
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        boolean isAdmin = hasRole(user, "ADMIN");
        if (!isAdmin && (payment.getUser() == null || !user.getId().equals(payment.getUser().getId()))) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }

        return toResponse(payment);
    }

    @Transactional
    public RevenueDashboardResponse getRevenueDashboard() {
        expireStalePendingPayments();

        User currentUser = getCurrentUser();
        boolean isAdmin = hasRole(currentUser, "ADMIN");
        List<Payment> scopedPayments = getScopedPayments(currentUser);

        BigDecimal totalRevenue = sumPaid(scopedPayments);
        LocalDate today = LocalDate.now();
        YearMonth currentMonth = YearMonth.now();

        BigDecimal revenueToday = scopedPayments.stream()
                .filter(this::isPaid)
                .filter(payment -> payment.getPaidAt() != null && payment.getPaidAt().toLocalDate().equals(today))
                .map(this::safeAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal revenueThisMonth = scopedPayments.stream()
                .filter(this::isPaid)
                .filter(payment -> payment.getPaidAt() != null && YearMonth.from(payment.getPaidAt()).equals(currentMonth))
                .map(this::safeAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long paidCount = scopedPayments.stream().filter(this::isPaid).count();
        long pendingCount = scopedPayments.stream().filter(payment -> payment.getStatus() == PaymentStatus.PENDING).count();
        long failedCount = scopedPayments.stream()
                .filter(payment -> payment.getStatus() == PaymentStatus.FAILED || payment.getStatus() == PaymentStatus.CANCELLED)
                .count();
        double conversionRate = scopedPayments.isEmpty()
                ? 0.0
                : roundTwoDecimals((paidCount * 100.0) / scopedPayments.size());

        return RevenueDashboardResponse.builder()
                .scope(isAdmin ? "ADMIN" : "INSTRUCTOR")
                .totalRevenue(totalRevenue)
                .revenueToday(revenueToday)
                .revenueThisMonth(revenueThisMonth)
                .totalTransactions(scopedPayments.size())
                .paidTransactions(paidCount)
                .pendingTransactions(pendingCount)
                .failedTransactions(failedCount)
                .conversionRatePercent(conversionRate)
                .revenueTrend(buildRevenueTrend(scopedPayments))
                .topCourses(buildTopRevenueCourses(scopedPayments))
                .statusStats(buildStatusStats(scopedPayments))
                .build();
    }

    @Transactional
    public PageResponse<PaymentTransactionResponse> getTransactions(
            String status,
            String keyword,
            int page,
            int size) {
        expireStalePendingPayments();

        User currentUser = getCurrentUser();
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase();
        PaymentStatus statusFilter = parseStatus(status);

        List<PaymentTransactionResponse> filtered = getScopedPayments(currentUser).stream()
                .filter(payment -> statusFilter == null || payment.getStatus() == statusFilter)
                .filter(payment -> matchesKeyword(payment, normalizedKeyword))
                .sorted(this::comparePaymentCreatedAtDesc)
                .map(this::toTransactionResponse)
                .toList();

        int safeSize = Math.max(1, Math.min(size, 100));
        int safePage = Math.max(0, page);
        int fromIndex = Math.min(safePage * safeSize, filtered.size());
        int toIndex = Math.min(fromIndex + safeSize, filtered.size());
        List<PaymentTransactionResponse> content = filtered.subList(fromIndex, toIndex);
        int totalPages = filtered.isEmpty() ? 0 : (int) Math.ceil((double) filtered.size() / safeSize);

        return PageResponse.<PaymentTransactionResponse>builder()
                .content(content)
                .page(safePage)
                .size(safeSize)
                .totalElements(filtered.size())
                .totalPages(totalPages)
                .build();
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

    private void expireStalePendingPayments() {
        if (pendingExpireMinutes <= 0) {
            return;
        }

        LocalDateTime expiredBefore = LocalDateTime.now().minusMinutes(pendingExpireMinutes);
        List<Payment> expiredPayments = paymentRepository.findByStatus(PaymentStatus.PENDING).stream()
                .filter(payment -> payment.getCreatedAt() != null)
                .filter(payment -> payment.getCreatedAt().isBefore(expiredBefore))
                .peek(payment -> payment.setStatus(PaymentStatus.CANCELLED))
                .toList();

        if (!expiredPayments.isEmpty()) {
            paymentRepository.saveAll(expiredPayments);
        }
    }

    private void createEnrollmentIfNeeded(Payment payment) {
        if (enrollmentRepository.existsByUserIdAndCourseId(
                payment.getUser().getId(), payment.getCourse().getId())) {
            return;
        }

        Enrollment enrollment = enrollmentRepository.save(Enrollment.builder()
                .user(payment.getUser())
                .course(payment.getCourse())
                .status(EnrollmentStatus.ACTIVE)
                .progressPercent(0.0)
                .enrolledAt(LocalDateTime.now())
                .lastAccessedAt(null)
                .build());
        appNotificationService.notifyCourseEnrollment(enrollment, true);
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
        if (payment.getAmount() == null || payment.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new AppException(
                    ErrorCode.INVALID_REQUEST,
                    "Số tiền thanh toán không hợp lệ.");
        }
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

    private PaymentTransactionResponse toTransactionResponse(Payment payment) {
        User user = payment.getUser();
        Course course = payment.getCourse();

        return PaymentTransactionResponse.builder()
                .id(payment.getId())
                .paymentCode(payment.getPaymentCode())
                .userId(user != null ? user.getId() : null)
                .username(user != null ? user.getUsername() : null)
                .fullName(user != null ? user.getFullName() : null)
                .email(user != null ? user.getEmail() : null)
                .courseId(course != null ? course.getId() : null)
                .courseTitle(course != null ? course.getTitle() : null)
                .instructorName(course != null ? getUserDisplayName(course.getInstructor()) : null)
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .provider(payment.getProvider())
                .status(payment.getStatus() != null ? payment.getStatus().name() : null)
                .bankCode(payment.getBankCode())
                .bankName(payment.getBankName())
                .accountNumber(payment.getAccountNumber())
                .sepayTransactionId(payment.getSepayTransactionId())
                .referenceCode(payment.getReferenceCode())
                .createdAt(payment.getCreatedAt())
                .paidAt(payment.getPaidAt())
                .build();
    }

    private List<Payment> getScopedPayments(User user) {
        boolean isAdmin = hasRole(user, "ADMIN");
        return paymentRepository.findAll().stream()
                .filter(payment -> isAdmin || isOwnedBy(payment.getCourse(), user))
                .toList();
    }

    private List<RevenueTrendPointResponse> buildRevenueTrend(List<Payment> payments) {
        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(6);
        Map<LocalDate, List<Payment>> paidByDate = payments.stream()
                .filter(this::isPaid)
                .filter(payment -> payment.getPaidAt() != null)
                .filter(payment -> {
                    LocalDate date = payment.getPaidAt().toLocalDate();
                    return !date.isBefore(start) && !date.isAfter(today);
                })
                .collect(Collectors.groupingBy(payment -> payment.getPaidAt().toLocalDate(), LinkedHashMap::new, Collectors.toList()));

        List<RevenueTrendPointResponse> result = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate date = start.plusDays(i);
            List<Payment> dailyPayments = paidByDate.getOrDefault(date, List.of());
            result.add(RevenueTrendPointResponse.builder()
                    .key(date.toString())
                    .label(date.getDayOfWeek().name().substring(0, 3))
                    .revenue(sumPaid(dailyPayments))
                    .paidCount(dailyPayments.size())
                    .build());
        }
        return result;
    }

    private List<RevenueCourseStatResponse> buildTopRevenueCourses(List<Payment> payments) {
        Map<String, List<Payment>> paymentsByCourse = payments.stream()
                .filter(payment -> payment.getCourse() != null)
                .collect(Collectors.groupingBy(payment -> payment.getCourse().getId()));

        return paymentsByCourse.values().stream()
                .map(coursePayments -> {
                    Course course = coursePayments.get(0).getCourse();
                    long paidCount = coursePayments.stream().filter(this::isPaid).count();
                    long pendingCount = coursePayments.stream().filter(payment -> payment.getStatus() == PaymentStatus.PENDING).count();

                    return RevenueCourseStatResponse.builder()
                            .courseId(course.getId())
                            .courseTitle(course.getTitle())
                            .instructorId(course.getInstructor() != null ? course.getInstructor().getId() : null)
                            .instructorName(getUserDisplayName(course.getInstructor()))
                            .paidCount(paidCount)
                            .pendingCount(pendingCount)
                            .revenue(sumPaid(coursePayments))
                            .build();
                })
                .sorted(Comparator.comparing(RevenueCourseStatResponse::getRevenue).reversed())
                .limit(8)
                .toList();
    }

    private List<RevenueStatusStatResponse> buildStatusStats(List<Payment> payments) {
        Map<PaymentStatus, List<Payment>> paymentsByStatus = payments.stream()
                .filter(payment -> payment.getStatus() != null)
                .collect(Collectors.groupingBy(Payment::getStatus));

        return paymentsByStatus.entrySet().stream()
                .map(entry -> RevenueStatusStatResponse.builder()
                        .status(entry.getKey().name())
                        .count(entry.getValue().size())
                        .amount(entry.getValue().stream()
                                .map(this::safeAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add))
                        .build())
                .sorted(Comparator.comparing(RevenueStatusStatResponse::getStatus))
                .toList();
    }

    private BigDecimal sumPaid(List<Payment> payments) {
        return payments.stream()
                .filter(this::isPaid)
                .map(this::safeAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private boolean isPaid(Payment payment) {
        return payment.getStatus() == PaymentStatus.PAID;
    }

    private BigDecimal safeAmount(Payment payment) {
        return payment.getAmount() == null ? BigDecimal.ZERO : payment.getAmount();
    }

    private boolean matchesKeyword(Payment payment, String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return true;
        }

        User user = payment.getUser();
        Course course = payment.getCourse();
        String searchable = String.join(" ",
                safeText(payment.getPaymentCode()),
                safeText(payment.getSepayTransactionId()),
                safeText(payment.getReferenceCode()),
                safeText(user != null ? user.getUsername() : null),
                safeText(user != null ? user.getFullName() : null),
                safeText(user != null ? user.getEmail() : null),
                safeText(course != null ? course.getTitle() : null),
                safeText(course != null ? course.getId() : null));
        return searchable.toLowerCase().contains(keyword);
    }

    private String safeText(String value) {
        return value == null ? "" : value;
    }

    private PaymentStatus parseStatus(String status) {
        if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)) {
            return null;
        }
        try {
            return PaymentStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }
    }

    private int comparePaymentCreatedAtDesc(Payment left, Payment right) {
        LocalDateTime leftTime = left.getCreatedAt();
        LocalDateTime rightTime = right.getCreatedAt();
        if (leftTime == null && rightTime == null) {
            return 0;
        }
        if (leftTime == null) {
            return 1;
        }
        if (rightTime == null) {
            return -1;
        }
        return rightTime.compareTo(leftTime);
    }

    private boolean requiresPayment(Course course) {
        return Boolean.TRUE.equals(course.getPaid())
                && course.getPrice() != null
                && course.getPrice().compareTo(BigDecimal.ZERO) > 0;
    }

    private void validateSepayConfig() {
        List<String> missingFields = new ArrayList<>();
        if (bankCode == null || bankCode.isBlank()) {
            missingFields.add("mã ngân hàng");
        }
        if (accountNumber == null || accountNumber.isBlank()) {
            missingFields.add("số tài khoản");
        }
        if (accountName == null || accountName.isBlank()) {
            missingFields.add("tên tài khoản");
        }
        if (!missingFields.isEmpty()) {
            throw new AppException(
                    ErrorCode.INVALID_REQUEST,
                    "Chưa cấu hình thông tin thanh toán: " + String.join(", ", missingFields) + ".");
        }
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    private boolean hasRole(User user, String roleName) {
        return user.getRoles() != null && user.getRoles().stream().anyMatch(role -> roleName.equals(role.getName()));
    }

    private boolean isOwnedBy(Course course, User user) {
        return course != null && course.getInstructor() != null && course.getInstructor().getId().equals(user.getId());
    }

    private String getUserDisplayName(User user) {
        if (user == null) {
            return "Khong xac dinh";
        }
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }
        return user.getUsername();
    }

    private double roundTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
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
