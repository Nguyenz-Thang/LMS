package com.nt.lms.dto.response;

import java.math.BigDecimal;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RevenueCourseStatResponse {
    String courseId;
    String courseTitle;
    String instructorId;
    String instructorName;
    long paidCount;
    long pendingCount;
    BigDecimal revenue;
}
