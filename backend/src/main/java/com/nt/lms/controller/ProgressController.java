package com.nt.lms.controller;

import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.service.ProgressService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/progress")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProgressController {

    ProgressService progressService;

    @PostMapping("/complete/{lessonId}")
    public ApiResponse<Void> complete(@PathVariable String lessonId) {
        progressService.completeLesson(lessonId);
        return ApiResponse.<Void>builder().build();
    }

    @GetMapping("/{courseId}")
    public ApiResponse<Double> get(@PathVariable String courseId) {
        return ApiResponse.<Double>builder()
                .result(progressService.getProgress(courseId))
                .build();
    }
}