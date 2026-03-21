package com.nt.lms.controller;

import java.util.List;

import com.nt.lms.dto.request.EnrollmentRequest;
import com.nt.lms.dto.response.ApiResponse;
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

    @GetMapping("/me")
    public ApiResponse<List<EnrollmentResponse>> myCourses() {
        return ApiResponse.<List<EnrollmentResponse>>builder()
                .result(enrollmentService.getMyCourses())
                .build();
    }
}