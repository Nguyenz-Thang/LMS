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
public class StandaloneQuizListItemResponse {
    private String quizId;
    private String title;
    private String description;
    private Integer questionCount;
    private Integer maxAttempts;
    private Integer timeLimitMinutes;
    private Boolean published;
    private Integer attemptCount;
    private Double bestScore;
    private Double bestScorePercent;
    private String latestAttemptId;
    private String latestAttemptStatus;
    private LocalDateTime latestStartedAt;
    private LocalDateTime latestSubmittedAt;
}
