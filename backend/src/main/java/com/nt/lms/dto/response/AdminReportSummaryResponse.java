package com.nt.lms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminReportSummaryResponse {
    private Integer totalCourses;
    private Integer totalLearners;
    private Integer activeEnrollments;
    private Integer completedEnrollments;
    private Integer totalLessons;
    private Integer totalQuizAttempts;
    private Double averageProgressPercent;
    private Double totalLearningHours;
}
