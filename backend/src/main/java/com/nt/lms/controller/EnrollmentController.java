package com.nt.lms.controller;

import java.util.List;

import com.nt.lms.dto.request.EnrollmentRequest;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.dto.response.ProgressDashboardResponse;
import com.nt.lms.dto.response.EnrollmentResponse;
import com.nt.lms.service.EnrollmentService;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/enrollments")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class EnrollmentController {

    EnrollmentService enrollmentService;

    @PostMapping
    public ApiResponse<EnrollmentResponse> enroll(@RequestBody EnrollmentRequest request) {
        return ApiResponse.<EnrollmentResponse>builder()
                .result(enrollmentService.enroll(request))
                .build();
    }

    @GetMapping
    public ApiResponse<List<EnrollmentResponse>> getAllEnrollments() {
        return ApiResponse.<List<EnrollmentResponse>>builder()
                .result(enrollmentService.getAllEnrollments())
                .build();
    }

    @GetMapping("/me")
    public ApiResponse<List<EnrollmentResponse>> myCourses() {
        return ApiResponse.<List<EnrollmentResponse>>builder()
                .result(enrollmentService.getMyCourses())
                .build();
    }

    @GetMapping("/me/dashboard")
    public ApiResponse<ProgressDashboardResponse> myDashboard() {
        return ApiResponse.<ProgressDashboardResponse>builder()
                .result(enrollmentService.getMyDashboard())
                .build();
    }

    @PutMapping("/access/{courseId}")
    public ApiResponse<EnrollmentResponse> markEnrollmentAccess(@PathVariable String courseId) {
        return ApiResponse.<EnrollmentResponse>builder()
                .result(enrollmentService.markEnrollmentAccess(courseId))
                .build();
    }
}
