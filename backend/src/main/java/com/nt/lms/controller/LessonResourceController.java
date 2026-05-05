package com.nt.lms.controller;

import com.nt.lms.dto.request.LessonResourceRequest;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.dto.response.LessonResourceResponse;
import com.nt.lms.service.LessonResourceService;
import java.util.List;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/lessons/{lessonId}/resources")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LessonResourceController {

	LessonResourceService lessonResourceService;

	@GetMapping
	public ApiResponse<List<LessonResourceResponse>> getByLesson(@PathVariable String lessonId) {
		return ApiResponse.<List<LessonResourceResponse>>builder()
				.result(lessonResourceService.getByLesson(lessonId))
				.build();
	}

	@PostMapping
	public ApiResponse<LessonResourceResponse> create(
			@PathVariable String lessonId,
			@RequestBody LessonResourceRequest request) {
		return ApiResponse.<LessonResourceResponse>builder()
				.result(lessonResourceService.create(lessonId, request))
				.build();
	}

	@PutMapping("/{resourceId}")
	public ApiResponse<LessonResourceResponse> update(
			@PathVariable String lessonId,
			@PathVariable String resourceId,
			@RequestBody LessonResourceRequest request) {
		return ApiResponse.<LessonResourceResponse>builder()
				.result(lessonResourceService.update(lessonId, resourceId, request))
				.build();
	}

	@DeleteMapping("/{resourceId}")
	public ApiResponse<Void> delete(@PathVariable String lessonId, @PathVariable String resourceId) {
		lessonResourceService.delete(lessonId, resourceId);
		return ApiResponse.<Void>builder().build();
	}
}
