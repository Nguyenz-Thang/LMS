package com.nt.lms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StandaloneQuizAttemptResponse {
    private String attemptId;
    private String quizId;
    private String quizTitle;
    private String quizDescription;
    private Integer attemptNo;
    private String attemptStatus;
    private Integer questionCount;
    private Double score;
    private Double totalScore;
    private Double scorePercent;
    private Boolean passed;
    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;
}
