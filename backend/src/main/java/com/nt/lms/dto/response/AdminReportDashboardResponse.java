package com.nt.lms.dto.response;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminReportDashboardResponse {
    private String scope;
    private AdminReportSummaryResponse summary;
    private List<AdminReportCourseStatResponse> topCourses;
    private List<AdminReportLearnerStatResponse> learners;
    private List<AdminReportInstructorStatResponse> topInstructors;
}
