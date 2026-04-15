package com.nt.lms.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class EnrollmentResponse {
    String id;
    String userId;
    String username;
    String courseId;
    String courseTitle;
    String status;
    Double progressPercent;
    LocalDateTime enrolledAt;
    LocalDateTime lastAccessedAt;
}