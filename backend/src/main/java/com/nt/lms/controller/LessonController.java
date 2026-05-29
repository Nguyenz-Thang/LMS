package com.nt.lms.controller;

import java.util.List;

import com.nt.lms.dto.request.LessonCreationRequest;
import com.nt.lms.dto.request.LessonUpdateRequest;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.dto.response.LearningLessonResourceResponse;
import com.nt.lms.dto.response.LessonResponse;
import com.nt.lms.service.LessonService;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/lessons")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LessonController {

    LessonService lessonService;

    @PostMapping
    public ApiResponse<LessonResponse> create(@RequestBody LessonCreationRequest request) {
        return ApiResponse.<LessonResponse>builder()
                .result(lessonService.createLesson(request))
                .build();
    }

    @GetMapping("/section/{sectionId}")
    public ApiResponse<List<LessonResponse>> getBySection(@PathVariable String sectionId) {
        return ApiResponse.<List<LessonResponse>>builder()
                .result(lessonService.getLessonsBySection(sectionId))
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<LessonResponse> get(@PathVariable String id) {
        return ApiResponse.<LessonResponse>builder()
                .result(lessonService.getLessonById(id))
                .build();
    }

    @GetMapping("/{id}/resources")
    public ApiResponse<List<LearningLessonResourceResponse>> getResources(@PathVariable String id) {
        return ApiResponse.<List<LearningLessonResourceResponse>>builder()
                .result(lessonService.getLessonResources(id))
                .build();
    }

    @PostMapping("/{id}/resources")
    public ApiResponse<List<LearningLessonResourceResponse>> uploadResources(
            @PathVariable String id,
            @RequestParam("files") MultipartFile[] files) {
        return ApiResponse.<List<LearningLessonResourceResponse>>builder()
                .result(lessonService.uploadLessonResources(id, files))
                .build();
    }

    @PutMapping("/{id}")
    public ApiResponse<LessonResponse> update(
            @PathVariable String id,
            @RequestBody LessonUpdateRequest request) {
        return ApiResponse.<LessonResponse>builder()
                .result(lessonService.updateLesson(id, request))
                .build();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        lessonService.deleteLessonById(id);
        return ApiResponse.<Void>builder().build();
    }

    @DeleteMapping("/{id}/resources/{resourceId}")
    public ApiResponse<Void> deleteResource(
            @PathVariable String id,
            @PathVariable String resourceId) {
        lessonService.deleteLessonResource(id, resourceId);
        return ApiResponse.<Void>builder().build();
    }
}
