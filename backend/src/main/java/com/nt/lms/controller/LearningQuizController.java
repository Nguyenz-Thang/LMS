package com.nt.lms.controller;

import com.nt.lms.dto.request.QuizAnswerRequest;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.dto.response.LearningQuizResponse;
import com.nt.lms.dto.response.StandaloneQuizAttemptResponse;
import com.nt.lms.dto.response.StandaloneQuizListItemResponse;
import com.nt.lms.service.LearningQuizService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/learning")
@RequiredArgsConstructor
public class LearningQuizController {

    private final LearningQuizService learningQuizService;

    @GetMapping("/quizzes/independent")
    public ApiResponse<List<StandaloneQuizListItemResponse>> getIndependentQuizzes() {
        return ApiResponse.<List<StandaloneQuizListItemResponse>>builder()
                .result(learningQuizService.getIndependentQuizzes())
                .build();
    }

    @GetMapping("/quizzes/{quizId}")
    public ApiResponse<LearningQuizResponse> getQuizDetail(@PathVariable String quizId) {
        return ApiResponse.<LearningQuizResponse>builder()
                .result(learningQuizService.getQuizDetail(quizId))
                .build();
    }

    @GetMapping("/attempts/history")
    public ApiResponse<List<StandaloneQuizAttemptResponse>> getIndependentQuizAttempts() {
        return ApiResponse.<List<StandaloneQuizAttemptResponse>>builder()
                .result(learningQuizService.getIndependentQuizAttempts())
                .build();
    }

    @GetMapping("/attempts/{attemptId}")
    public ApiResponse<LearningQuizResponse> getAttemptReview(@PathVariable String attemptId) {
        return ApiResponse.<LearningQuizResponse>builder()
                .result(learningQuizService.getAttemptReview(attemptId))
                .build();
    }

    @PostMapping("/quizzes/{quizId}/start")
    public ApiResponse<LearningQuizResponse> startQuiz(@PathVariable String quizId) {
        return ApiResponse.<LearningQuizResponse>builder()
                .result(learningQuizService.startQuiz(quizId))
                .build();
    }

    @PostMapping("/attempts/{attemptId}/answer")
    public ApiResponse<LearningQuizResponse> saveAnswer(
            @PathVariable String attemptId,
            @RequestBody QuizAnswerRequest request
    ) {
        return ApiResponse.<LearningQuizResponse>builder()
                .result(learningQuizService.saveAnswer(attemptId, request))
                .build();
    }

    @PostMapping("/attempts/{attemptId}/submit")
    public ApiResponse<LearningQuizResponse> submitQuiz(@PathVariable String attemptId) {
        return ApiResponse.<LearningQuizResponse>builder()
                .result(learningQuizService.submitQuiz(attemptId))
                .build();
    }
}
