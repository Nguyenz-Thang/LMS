package com.nt.lms.controller;

import com.nt.lms.dto.response.AdminReportDashboardResponse;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.service.ReportService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReportController {

    ReportService reportService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    public ApiResponse<AdminReportDashboardResponse> getDashboard(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String courseId,
            @RequestParam(required = false) String learnerId,
            @RequestParam(required = false) String instructorId,
            @RequestParam(required = false) String status) {
        return ApiResponse.<AdminReportDashboardResponse>builder()
                .result(reportService.getDashboard(fromDate, toDate, courseId, learnerId, instructorId, status))
                .build();
    }
}
