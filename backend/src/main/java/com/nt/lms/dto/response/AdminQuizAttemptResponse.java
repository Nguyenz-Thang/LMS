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
public class AdminQuizAttemptResponse {
    private String attemptId;
    private String quizId;
    private String quizTitle;
    private String userId;
    private String username;
    private String fullName;
    private String email;
    private Integer attemptNo;
    private String status;
    private Double score;
    private Double totalScore;
    private Double scorePercent;
    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;
}
