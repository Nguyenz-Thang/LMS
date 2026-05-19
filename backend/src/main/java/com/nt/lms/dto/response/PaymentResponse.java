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
public class PaymentResponse {
    String id;
    String paymentCode;
    String courseId;
    String courseTitle;
    BigDecimal amount;
    String currency;
    String status;
    String provider;
    String bankCode;
    String bankName;
    String accountNumber;
    String accountName;
    String qrUrl;
    LocalDateTime createdAt;
    LocalDateTime paidAt;
}
