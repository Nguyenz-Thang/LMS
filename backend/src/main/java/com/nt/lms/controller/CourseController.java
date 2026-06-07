package com.nt.lms.controller;

import com.nt.lms.dto.request.CourseRequest;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.dto.response.CourseCurriculumResponse;
import com.nt.lms.dto.response.CourseResponse;
import com.nt.lms.dto.response.PageResponse;
import com.nt.lms.service.CourseService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/courses")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CourseController {

    CourseService courseService;

    @PostMapping
    public ApiResponse<CourseResponse> create(@RequestBody CourseRequest request) {
        return ApiResponse.<CourseResponse>builder()
                .result(courseService.createCourse(request))
                .build();
    }

    @GetMapping("/{id}/curriculum")
    public ApiResponse<CourseCurriculumResponse> getCurriculum(@PathVariable String id) {
        return ApiResponse.<CourseCurriculumResponse>builder()
                .result(courseService.getCourseCurriculum(id))
                .build();
    }

    @GetMapping("/{id}")
    public ApiResponse<CourseResponse> get(@PathVariable String id) {
        return ApiResponse.<CourseResponse>builder()
                .result(courseService.getCourse(id))
                .build();
    }

    @PutMapping("/{id}")
    public ApiResponse<CourseResponse> update(@PathVariable String id,
                                              @RequestBody CourseRequest request) {
        return ApiResponse.<CourseResponse>builder()
                .result(courseService.updateCourse(id, request))
                .build();
    }

    @PostMapping("/{id}/approve")
    public ApiResponse<CourseResponse> approve(@PathVariable String id) {
        return ApiResponse.<CourseResponse>builder()
                .result(courseService.approveCourse(id))
                .build();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable String id) {
        courseService.deleteCourse(id);
        return ApiResponse.<Void>builder().build();
    }

    @GetMapping
    public ApiResponse<PageResponse<CourseResponse>> getCourses(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "false") boolean manageOnly,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        return ApiResponse.<PageResponse<CourseResponse>>builder()
                .result(courseService.getCoursesPage(keyword, manageOnly, status, page, size))
                .build();
    }
}
