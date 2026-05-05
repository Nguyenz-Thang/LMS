package com.nt.lms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminReportCourseStatResponse {
    private String courseId;
    private String courseTitle;
    private String instructorId;
    private String instructorName;
    private Integer enrollmentCount;
    private Integer activeLearnerCount;
    private Integer completedLearnerCount;
    private Double averageProgressPercent;
    private Double averageQuizScorePercent;
    private Double totalLearningHours;
}
