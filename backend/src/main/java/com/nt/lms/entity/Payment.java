package com.nt.lms.entity;

import com.nt.lms.enums.PaymentStatus;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "payments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(name = "payment_code", unique = true, nullable = false)
    String paymentCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id")
    Course course;

    @Column(nullable = false, precision = 12, scale = 2)
    BigDecimal amount;

    String currency;
    String provider;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    PaymentStatus status;

    @Column(name = "bank_code")
    String bankCode;

    @Column(name = "bank_name")
    String bankName;

    @Column(name = "account_number")
    String accountNumber;

    @Column(name = "account_name")
    String accountName;

    @Column(name = "qr_url", columnDefinition = "TEXT")
    String qrUrl;

    @Column(name = "sepay_transaction_id")
    String sepayTransactionId;

    @Column(name = "reference_code")
    String referenceCode;

    @Column(name = "paid_content", columnDefinition = "TEXT")
    String paidContent;

    @Column(name = "created_at")
    LocalDateTime createdAt;

    @Column(name = "paid_at")
    LocalDateTime paidAt;
}
