package com.nt.lms.dto.response;

import java.math.BigDecimal;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RevenueTrendPointResponse {
    String key;
    String label;
    BigDecimal revenue;
    long paidCount;
}
