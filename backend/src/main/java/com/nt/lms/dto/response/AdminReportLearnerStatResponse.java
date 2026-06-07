package com.nt.lms.dto.response;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminReportLearnerStatResponse {
    private String userId;
    private String username;
    private String learnerName;
    private String courseId;
    private String courseTitle;
    private String instructorName;
    private String status;
    private LocalDateTime enrolledAt;
    private LocalDateTime lastAccessedAt;
    private Double progressPercent;
    private Integer completedLessons;
    private Integer totalLessons;
    private Integer quizAttemptCount;
    private Double averageQuizScorePercent;
    private Double learningHours;
}
