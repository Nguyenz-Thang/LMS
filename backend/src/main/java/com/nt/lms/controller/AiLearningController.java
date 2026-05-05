package com.nt.lms.controller;

import com.nt.lms.dto.request.AiLessonAssistantRequest;
import com.nt.lms.dto.response.AiLessonAssistantResponse;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.service.AiLearningService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/learning/lessons")
@RequiredArgsConstructor
public class AiLearningController {

	private final AiLearningService aiLearningService;

	@PostMapping("/{lessonId}/assistant")
	public ApiResponse<AiLessonAssistantResponse> askLessonAssistant(
			@PathVariable String lessonId,
			@RequestBody AiLessonAssistantRequest request) {
		String username = SecurityContextHolder.getContext().getAuthentication().getName();
		return ApiResponse.<AiLessonAssistantResponse>builder()
				.result(aiLearningService.answerLessonQuestion(lessonId, request, username))
				.build();
	}
}
