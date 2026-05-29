package com.nt.lms.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PaymentTransactionResponse {
    String id;
    String paymentCode;
    String userId;
    String username;
    String fullName;
    String email;
    String courseId;
    String courseTitle;
    String instructorName;
    BigDecimal amount;
    String currency;
    String provider;
    String status;
    String bankCode;
    String bankName;
    String accountNumber;
    String sepayTransactionId;
    String referenceCode;
    LocalDateTime createdAt;
    LocalDateTime paidAt;
}
