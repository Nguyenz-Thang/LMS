package com.nt.lms.controller;

import com.nt.lms.dto.request.CreateQuizRequest;
import com.nt.lms.dto.request.SubmitQuizRequest;
import com.nt.lms.dto.response.AdminQuizAttemptResponse;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.dto.response.QuizResponse;
import com.nt.lms.dto.response.QuizResultResponse;
import com.nt.lms.service.QuizService;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/quizzes")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class QuizController {

    QuizService quizService;

    @PostMapping
    ApiResponse<String> createQuiz(@RequestBody CreateQuizRequest request) {
        quizService.createQuiz(request);
        return ApiResponse.<String>builder()
                .result("Quiz created successfully")
                .build();
    }

    @GetMapping("/{quizId}")
    ApiResponse<QuizResponse> getQuiz(@PathVariable String quizId) {
        return ApiResponse.<QuizResponse>builder()
                .result(quizService.getQuiz(quizId))
                .build();
    }

    @PutMapping("/{quizId}")
    ApiResponse<String> updateQuiz(
            @PathVariable String quizId,
            @RequestBody CreateQuizRequest request) {
        quizService.updateQuiz(quizId, request);
        return ApiResponse.<String>builder()
                .result("Quiz updated successfully")
                .build();
    }

    @DeleteMapping("/{quizId}")
    ApiResponse<String> deleteQuiz(@PathVariable String quizId) {
        quizService.deleteQuiz(quizId);
        return ApiResponse.<String>builder()
                .result("Quiz deleted successfully")
                .build();
    }

    @PreAuthorize("hasAnyRole('ADMIN','INSTRUCTOR')")
    @PostMapping("/{quizId}/publish")
    ApiResponse<String> publishQuiz(@PathVariable String quizId) {
        quizService.updateQuizPublishStatus(quizId, true);
        return ApiResponse.<String>builder()
                .result("Quiz published successfully")
                .build();
    }

    @PreAuthorize("hasAnyRole('ADMIN','INSTRUCTOR')")
    @PostMapping("/{quizId}/unpublish")
    ApiResponse<String> unpublishQuiz(@PathVariable String quizId) {
        quizService.updateQuizPublishStatus(quizId, false);
        return ApiResponse.<String>builder()
                .result("Quiz unpublished successfully")
                .build();
    }

    @PostMapping("/submit")
    ApiResponse<QuizResultResponse> submitQuiz(@RequestBody SubmitQuizRequest request) {
        return ApiResponse.<QuizResultResponse>builder()
                .result(quizService.submitQuiz(request))
                .build();
    }

    @PreAuthorize("hasAnyRole('ADMIN','INSTRUCTOR')")
    @GetMapping("/{quizId}/attempts")
    ApiResponse<List<AdminQuizAttemptResponse>> getQuizAttempts(@PathVariable String quizId) {
        return ApiResponse.<List<AdminQuizAttemptResponse>>builder()
                .result(quizService.getQuizAttempts(quizId))
                .build();
    }

    @GetMapping
    ApiResponse<List<QuizResponse>> getAllQuizzes() {
        return ApiResponse.<List<QuizResponse>>builder()
                .result(quizService.getAllQuizzes())
                .build();
    }
}
