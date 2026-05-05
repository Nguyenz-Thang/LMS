package com.nt.lms.controller;

import com.nt.lms.dto.request.AssignmentSubmissionRequest;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.dto.response.LearningAssignmentResponse;
import com.nt.lms.service.LearningAssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/learning")
@RequiredArgsConstructor
public class LearningAssignmentController {

    private final LearningAssignmentService learningAssignmentService;

    @GetMapping("/assignments/{assignmentId}")
    public ApiResponse<LearningAssignmentResponse> getAssignmentDetail(@PathVariable String assignmentId) {
        return ApiResponse.<LearningAssignmentResponse>builder()
                .result(learningAssignmentService.getAssignmentDetail(assignmentId))
                .build();
    }

    @PostMapping("/assignments/{assignmentId}/submission")
    public ApiResponse<LearningAssignmentResponse> saveSubmission(
            @PathVariable String assignmentId,
            @RequestBody AssignmentSubmissionRequest request
    ) {
        return ApiResponse.<LearningAssignmentResponse>builder()
                .result(learningAssignmentService.saveSubmission(assignmentId, request))
                .build();
    }

    @PostMapping("/assignments/{assignmentId}/files")
    public ApiResponse<LearningAssignmentResponse> uploadSubmissionFiles(
            @PathVariable String assignmentId,
            @RequestParam("files") MultipartFile[] files
    ) {
        return ApiResponse.<LearningAssignmentResponse>builder()
                .result(learningAssignmentService.uploadSubmissionFiles(assignmentId, files))
                .build();
    }

    @DeleteMapping("/assignments/{assignmentId}/files/{fileId}")
    public ApiResponse<LearningAssignmentResponse> deleteSubmissionFile(
            @PathVariable String assignmentId,
            @PathVariable String fileId
    ) {
        return ApiResponse.<LearningAssignmentResponse>builder()
                .result(learningAssignmentService.deleteSubmissionFile(assignmentId, fileId))
                .build();
    }
}