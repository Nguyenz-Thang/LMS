package com.nt.lms.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class InstructorAssignmentSubmissionResponse {
    String id;
    String assignmentId;
    String assignmentTitle;
    String courseId;
    String courseTitle;
    String lessonId;
    String lessonTitle;
    String studentId;
    String studentName;
    String studentUsername;
    String studentEmail;
    String submissionText;
    LocalDateTime submittedAt;
    String status;
    Double score;
    Double maxScore;
    String feedback;
    String gradedByName;
    LocalDateTime gradedAt;
    List<LearningSubmissionFileResponse> files;
}
