package com.nt.lms.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningAssignmentResponse {
    private String assignmentId;
    private String courseId;
    private String lessonId;

    private String title;
    private String description;
    private String assignmentType;

    private String submissionId;
    private String submissionText;
    private String submissionStatus;
    private String submittedAt;
    private Double score;
    private String feedback;

    private List<LearningSubmissionFileResponse> files;
}
