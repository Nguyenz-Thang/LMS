package com.nt.lms.dto.response;

import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class InstructorAssignmentSummaryResponse {
    String assignmentId;
    String assignmentTitle;
    String assignmentType;
    String courseId;
    String courseTitle;
    String instructorName;
    String lessonId;
    String lessonTitle;
    long totalSubmitted;
    long gradedCount;
    long pendingCount;
    long draftCount;
    LocalDateTime lastSubmittedAt;
}
