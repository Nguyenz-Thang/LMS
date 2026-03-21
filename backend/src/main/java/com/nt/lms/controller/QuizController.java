package com.nt.lms.controller;

import com.nt.lms.dto.request.CreateQuizRequest;
import com.nt.lms.dto.request.SubmitQuizRequest;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.dto.response.QuizResponse;
import com.nt.lms.dto.response.QuizResultResponse;
import com.nt.lms.service.QuizService;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/quizzes")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class QuizController {

    QuizService quizService;

    @PostMapping("/submit")
    public ApiResponse<QuizResultResponse> submit(@RequestBody SubmitQuizRequest request) {
        return ApiResponse.<QuizResultResponse>builder()
                .result(quizService.submitQuiz(request))
                .build();
    }
    @PostMapping
    public ApiResponse<Void> createQuiz(@RequestBody CreateQuizRequest request) {
        quizService.createQuiz(request);
        return ApiResponse.<Void>builder().build();
    }

    @GetMapping("/{id}")
    public ApiResponse<QuizResponse> getQuiz(@PathVariable String id) {
        return ApiResponse.<QuizResponse>builder()
                .result(quizService.getQuiz(id))
                .build();
    }

    @PutMapping("/{id}")
    public ApiResponse<Void> updateQuiz(@PathVariable String id,
                                    @RequestBody CreateQuizRequest request) {
        quizService.updateQuiz(id, request);
        return ApiResponse.<Void>builder().build();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteQuiz(@PathVariable String id) {
        quizService.deleteQuiz(id);
        return ApiResponse.<Void>builder().build();
    }
}