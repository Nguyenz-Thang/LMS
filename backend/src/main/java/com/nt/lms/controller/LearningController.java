package com.nt.lms.controller;

import com.nt.lms.dto.request.LessonNoteRequest;
import com.nt.lms.dto.request.LessonProgressRequest;
import com.nt.lms.dto.request.LearningStartRequest;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.dto.response.LearningCourseResponse;
import com.nt.lms.dto.response.LearningLessonDetailResponse;
import com.nt.lms.dto.response.LearningLessonNoteResponse;
import com.nt.lms.dto.response.LearningStartResponse;
import com.nt.lms.service.LearningService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/learning")
@RequiredArgsConstructor
public class LearningController {

	private final LearningService learningService;

	@PostMapping("/courses/{courseId}/start")
	public ApiResponse<LearningStartResponse> startCourse(
			@PathVariable String courseId,
			@RequestBody(required = false) LearningStartRequest request) {
		return ApiResponse.<LearningStartResponse>builder()
				.result(learningService.startCourse(courseId, request))
				.build();
	}

	@GetMapping("/courses/{courseId}")
	public ApiResponse<LearningCourseResponse> getLearningCourse(@PathVariable String courseId) {
		return ApiResponse.<LearningCourseResponse>builder()
				.result(learningService.getLearningCourse(courseId))
				.build();
	}

	@GetMapping("/courses/{courseId}/lessons/{lessonId}")
	public ApiResponse<LearningLessonDetailResponse> getLessonDetail(
			@PathVariable String courseId,
			@PathVariable String lessonId) {
		return ApiResponse.<LearningLessonDetailResponse>builder()
				.result(learningService.getLessonDetail(courseId, lessonId))
				.build();
	}

	@PostMapping("/lessons/{lessonId}/progress")
	public ApiResponse<String> saveLessonProgress(
			@PathVariable String lessonId,
			@RequestBody LessonProgressRequest request) {
		learningService.saveLessonProgress(lessonId, request);
		return ApiResponse.<String>builder()
				.result("Cap nhat tien do thanh cong")
				.build();
	}

	@GetMapping("/lessons/{lessonId}/notes")
	public ApiResponse<List<LearningLessonNoteResponse>> getLessonNotes(@PathVariable String lessonId) {
		return ApiResponse.<List<LearningLessonNoteResponse>>builder()
				.result(learningService.getLessonNotes(lessonId))
				.build();
	}

	@PostMapping("/lessons/{lessonId}/notes")
	public ApiResponse<LearningLessonNoteResponse> createLessonNote(
			@PathVariable String lessonId,
			@RequestBody LessonNoteRequest request) {
		return ApiResponse.<LearningLessonNoteResponse>builder()
				.result(learningService.createLessonNote(lessonId, request))
				.build();
	}

	@PutMapping("/lessons/{lessonId}/notes/{noteId}")
	public ApiResponse<LearningLessonNoteResponse> updateLessonNote(
			@PathVariable String lessonId,
			@PathVariable String noteId,
			@RequestBody LessonNoteRequest request) {
		return ApiResponse.<LearningLessonNoteResponse>builder()
				.result(learningService.updateLessonNote(lessonId, noteId, request))
				.build();
	}

	@DeleteMapping("/lessons/{lessonId}/notes/{noteId}")
	public ApiResponse<String> deleteLessonNote(@PathVariable String lessonId, @PathVariable String noteId) {
		learningService.deleteLessonNote(lessonId, noteId);
		return ApiResponse.<String>builder()
				.result("Xoa ghi chu thanh cong")
				.build();
	}

}
