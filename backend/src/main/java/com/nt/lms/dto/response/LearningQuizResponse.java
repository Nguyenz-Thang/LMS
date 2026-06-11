package com.nt.lms.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningQuizResponse {
    private String quizId;
    private String title;
    private String description;
    private String quizScope;
    private Integer timeLimitMinutes;
    private Integer maxAttempts;
    private Integer passingScore;

    private String attemptId;
    private Integer attemptNo;
    private String attemptStatus;
    private Double score;
    private Double totalScore;
    private Boolean passed;
    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;

    private List<LearningQuizQuestionResponse> questions;
}
