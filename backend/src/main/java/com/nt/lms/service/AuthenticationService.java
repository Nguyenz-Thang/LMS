package com.nt.lms.service;

import java.text.ParseException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.Base64;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.nio.charset.StandardCharsets;
import java.util.StringJoiner;
import java.util.UUID;

import com.nt.lms.dto.request.ForgotPasswordRequest;
import com.nt.lms.dto.request.ResetPasswordRequest;
import com.nt.lms.entity.PasswordResetToken;
import com.nt.lms.entity.User;
import com.nt.lms.repository.PasswordResetTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.CollectionUtils;

import com.nt.lms.dto.request.AuthenticatitonRequest;
import com.nt.lms.dto.request.IntrospectRequest;
import com.nt.lms.dto.request.LogoutRequest;
import com.nt.lms.dto.request.RefreshRequest;
import com.nt.lms.dto.response.AuthenticationResponse;
import com.nt.lms.dto.response.IntrospectResponse;
import com.nt.lms.entity.InvalidatedToken;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.repository.InvalidatedTokenRepository;
import com.nt.lms.repository.UserRepository;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthenticationService {
    UserRepository userRepository;
    InvalidatedTokenRepository invalidatedTokenRepository;
    PasswordResetTokenRepository passwordResetTokenRepository;
    PasswordEncoder passwordEncoder;
    EmailNotificationService emailNotificationService;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final long RESET_PASSWORD_TOKEN_MINUTES = 15;

    @NonFinal
    @Value("${jwt.signerKey}")
    protected String SIGNER_KEY;

    @NonFinal
    @Value("${jwt.valid-duration}")
    protected long VALID_DURATION;

    @NonFinal
    @Value("${jwt.refreshable-duration}")
    protected long REFRESHABLE_DURATION;

    @NonFinal
    @Value("${lms.frontend-base-url:http://localhost:5173}")
    protected String FRONTEND_BASE_URL;

    public IntrospectResponse introspect(IntrospectRequest request) throws JOSEException, ParseException {
        var token = request.getToken();
        boolean isValid = true;

        try {
            verifyToken(token, false);
        } catch (AppException e) {
            isValid = false;
        }

        return IntrospectResponse.builder().valid(isValid).build();
    }

    public AuthenticationResponse authenticate(AuthenticatitonRequest request) {
        var user = userRepository
                .findByUsername(request.getUsername())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        boolean authenticated = passwordEncoder.matches(request.getPassword(), user.getPassword());
        if (!authenticated) throw new AppException(ErrorCode.PASSWORD_NOT_MATCH);

        var token = generateToken(user);

        return AuthenticationResponse.builder().token(token).authenticated(true).build();
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        userRepository.findByEmail(request.getEmail().trim()).ifPresent(user -> {
            invalidateActiveResetTokens(user.getId());

            String rawToken = generateResetToken();
            LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(RESET_PASSWORD_TOKEN_MINUTES);

            passwordResetTokenRepository.save(PasswordResetToken.builder()
                    .tokenHash(hashToken(rawToken))
                    .user(user)
                    .expiresAt(expiresAt)
                    .used(false)
                    .build());

            String resetUrl = FRONTEND_BASE_URL + "/reset-password?token=" + rawToken;
            boolean sent = emailNotificationService.sendPasswordResetEmail(user, resetUrl, expiresAt);
            if (!sent) {
                throw new AppException(ErrorCode.EMAIL_SEND_FAILED);
            }
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (request.getToken() == null || request.getToken().isBlank()
                || request.getNewPassword() == null || request.getNewPassword().isBlank()
                || request.getConfirmPassword() == null || request.getConfirmPassword().isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (!Objects.equals(request.getNewPassword(), request.getConfirmPassword())) {
            throw new AppException(ErrorCode.PASSWORD_NOT_MATCH);
        }

        PasswordResetToken resetToken = passwordResetTokenRepository
                .findByTokenHashAndUsedFalse(hashToken(request.getToken().trim()))
                .orElseThrow(() -> new AppException(ErrorCode.RESET_TOKEN_INVALID));

        if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            markResetTokenUsed(resetToken);
            throw new AppException(ErrorCode.RESET_TOKEN_EXPIRED);
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        markResetTokenUsed(resetToken);
        invalidateActiveResetTokens(user.getId());
    }

    public void logout(LogoutRequest request) throws ParseException, JOSEException {
        try {
            var signToken = verifyToken(request.getToken(), false);
            String jit = signToken.getJWTClaimsSet().getJWTID();
            Date expiryTime = signToken.getJWTClaimsSet().getExpirationTime();

            InvalidatedToken invalidatedToken =
                    InvalidatedToken.builder().id(jit).expiryTime(expiryTime).build();
            invalidatedTokenRepository.save(invalidatedToken);
        } catch (AppException exception) {
            log.info("Token already expired");
        }
    }

    public AuthenticationResponse refreshToken(RefreshRequest request) throws ParseException, JOSEException {
        var signJWT = verifyToken(request.getToken(), true);

        var jit = signJWT.getJWTClaimsSet().getJWTID();
        var expiryTime = signJWT.getJWTClaimsSet().getExpirationTime();

        InvalidatedToken invalidatedToken =
                InvalidatedToken.builder().id(jit).expiryTime(expiryTime).build();
        invalidatedTokenRepository.save(invalidatedToken);

        var username = signJWT.getJWTClaimsSet().getSubject();
        var user =
                userRepository.findByUsername(username).orElseThrow(() -> new AppException(ErrorCode.UNAUTHENTICATED));
        var token = generateToken(user);

        return AuthenticationResponse.builder().token(token).authenticated(true).build();
    }

    private SignedJWT verifyToken(String token, boolean isRefresh) throws JOSEException, ParseException {
        JWSVerifier verifier = new MACVerifier(SIGNER_KEY.getBytes());

        SignedJWT signedJWT = SignedJWT.parse(token);

        Date expryTime = (isRefresh)
                ? Date.from(signedJWT
                        .getJWTClaimsSet()
                        .getIssueTime()
                        .toInstant()
                        .plus(Duration.ofHours(REFRESHABLE_DURATION)))
                : signedJWT.getJWTClaimsSet().getExpirationTime();

        var verified = signedJWT.verify(verifier);

        if (!(verified && expryTime.after(new Date()))) throw new AppException(ErrorCode.UNAUTHENTICATED);

        if (invalidatedTokenRepository.existsById(signedJWT.getJWTClaimsSet().getJWTID()))
            throw new AppException(ErrorCode.UNAUTHENTICATED);

        return signedJWT;
    }

    private String generateToken(User user) {
        JWSHeader header = new JWSHeader(JWSAlgorithm.HS256);

        JWTClaimsSet jwtClaimsSet = new JWTClaimsSet.Builder()
                .subject(user.getUsername())
                .issuer("lms.com")
                .issueTime(new Date())
                .expirationTime(Date.from(Instant.now().plus(Duration.ofHours(VALID_DURATION))))
                .jwtID(UUID.randomUUID().toString())
                .claim("scope", buildScope(user))
                .build();
        Payload payload = new Payload(jwtClaimsSet.toJSONObject());
        JWSObject jwsObject = new JWSObject(header, payload);

        try {
            jwsObject.sign(new MACSigner(SIGNER_KEY.getBytes()));
            return jwsObject.serialize();
        } catch (JOSEException e) {
            throw new RuntimeException(e);
        }
    }

    private String generateResetToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    private void invalidateActiveResetTokens(String userId) {
        List<PasswordResetToken> activeTokens = passwordResetTokenRepository.findByUserIdAndUsedFalse(userId);
        activeTokens.forEach(this::markResetTokenUsed);
    }

    private void markResetTokenUsed(PasswordResetToken token) {
        token.setUsed(true);
        token.setUsedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(token);
    }

    private String buildScope(User user) {
        StringJoiner stringJoiner = new StringJoiner(" ");

        if (!CollectionUtils.isEmpty(user.getRoles())) {
            user.getRoles().forEach(role -> {
                stringJoiner.add("ROLE_" + role.getName());
            });
        }

        return stringJoiner.toString();
    }
}
