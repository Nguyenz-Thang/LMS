package com.nt.lms.controller;

import com.nt.lms.dto.request.AiQuizGenerationRequest;
import com.nt.lms.dto.response.AiQuizDraftResponse;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.service.AiLearningService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/quizzes/ai")
@RequiredArgsConstructor
public class AiQuizController {

	private final AiLearningService aiLearningService;

	@PostMapping("/lessons/{lessonId}/generate")
	@PreAuthorize("hasAnyRole('ADMIN', 'INSTRUCTOR')")
	public ApiResponse<AiQuizDraftResponse> generateQuizFromLesson(
			@PathVariable String lessonId,
			@RequestBody(required = false) AiQuizGenerationRequest request) {
		String username = SecurityContextHolder.getContext().getAuthentication().getName();
		return ApiResponse.<AiQuizDraftResponse>builder()
				.result(aiLearningService.generateQuizDraftFromLesson(lessonId, request, username))
				.build();
	}
}
