package com.nt.lms.controller;

import java.util.List;

import com.nt.lms.dto.request.LessonRequest;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.dto.response.LessonResponse;
import com.nt.lms.service.LessonService;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/lessons")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LessonController {

    LessonService lessonService;

    @PostMapping
    public ApiResponse<LessonResponse> create(@RequestBody LessonRequest request) {
        return ApiResponse.<LessonResponse>builder()
                .result(lessonService.createLesson(request))
                .build();
    }

    @GetMapping("/course/{courseId}")
    public ApiResponse<List<LessonResponse>> getByCourse(@PathVariable String courseId) {
        return ApiResponse.<List<LessonResponse>>builder()
                .result(lessonService.getLessonsByCourse(courseId))
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<LessonResponse> get(@PathVariable String id) {
        return ApiResponse.<LessonResponse>builder()
                .result(lessonService.getLesson(id))
                .build();
    }

    @PutMapping("/{id}")
    public ApiResponse<LessonResponse> update(@PathVariable String id,
                                              @RequestBody LessonRequest request) {
        return ApiResponse.<LessonResponse>builder()
                .result(lessonService.updateLesson(id, request))
                .build();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        lessonService.deleteLesson(id);
        return ApiResponse.<Void>builder().build();
    }
}
