package com.nt.lms.controller;

import com.nt.lms.dto.request.GradeAssignmentSubmissionRequest;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.dto.response.InstructorAssignmentSummaryResponse;
import com.nt.lms.dto.response.InstructorAssignmentSubmissionResponse;
import com.nt.lms.service.InstructorAssignmentService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class InstructorAssignmentController {
    private final InstructorAssignmentService instructorAssignmentService;

    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    @GetMapping("/assignments/summary")
    public ApiResponse<List<InstructorAssignmentSummaryResponse>> listAssignmentSummaries() {
        return ApiResponse.<List<InstructorAssignmentSummaryResponse>>builder()
                .result(instructorAssignmentService.listAssignmentSummaries())
                .build();
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    @GetMapping("/assignments/{assignmentId}/submissions")
    public ApiResponse<List<InstructorAssignmentSubmissionResponse>> listSubmissions(
            @PathVariable String assignmentId) {
        return ApiResponse.<List<InstructorAssignmentSubmissionResponse>>builder()
                .result(instructorAssignmentService.listSubmissions(assignmentId))
                .build();
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
    @PutMapping("/assignments/submissions/{submissionId}/grade")
    public ApiResponse<InstructorAssignmentSubmissionResponse> gradeSubmission(
            @PathVariable String submissionId,
            @RequestBody GradeAssignmentSubmissionRequest request) {
        return ApiResponse.<InstructorAssignmentSubmissionResponse>builder()
                .result(instructorAssignmentService.gradeSubmission(submissionId, request))
                .build();
    }
}
