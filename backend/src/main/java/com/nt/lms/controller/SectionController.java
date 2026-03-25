package com.nt.lms.controller;

import com.nt.lms.dto.request.SectionRequest;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.dto.response.SectionResponse;
import com.nt.lms.service.SectionService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/sections")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SectionController {

    SectionService sectionService;

    @PostMapping
    public ApiResponse<SectionResponse> create(@RequestBody SectionRequest request) {
        return ApiResponse.<SectionResponse>builder()
                .result(sectionService.createSection(request))
                .build();
    }

    @GetMapping("/course/{courseId}")
    public ApiResponse<List<SectionResponse>> getByCourse(@PathVariable String courseId) {
        return ApiResponse.<List<SectionResponse>>builder()
                .result(sectionService.getSectionsByCourse(courseId))
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<SectionResponse> get(@PathVariable String id) {
        return ApiResponse.<SectionResponse>builder()
                .result(sectionService.getSection(id))
                .build();
    }

    @PutMapping("/{id}")
    public ApiResponse<SectionResponse> update(@PathVariable String id,
                                               @RequestBody SectionRequest request) {
        return ApiResponse.<SectionResponse>builder()
                .result(sectionService.updateSection(id, request))
                .build();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        sectionService.deleteSection(id);
        return ApiResponse.<Void>builder().build();
    }
}