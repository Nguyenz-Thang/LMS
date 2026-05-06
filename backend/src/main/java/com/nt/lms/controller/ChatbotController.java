package com.nt.lms.controller;

import com.nt.lms.dto.request.ChatbotConversationRequest;
import com.nt.lms.dto.request.ChatbotMessageRequest;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.dto.response.ChatbotConversationResponse;
import com.nt.lms.dto.response.ChatbotMessageResponse;
import com.nt.lms.service.ChatbotService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/chatbot")
@RequiredArgsConstructor
public class ChatbotController {
	private final ChatbotService chatbotService;

	@GetMapping("/conversations")
	public ApiResponse<List<ChatbotConversationResponse>> listConversations() {
		return ApiResponse.<List<ChatbotConversationResponse>>builder()
				.result(chatbotService.listConversations())
				.build();
	}

	@PostMapping("/conversations")
	public ApiResponse<ChatbotConversationResponse> createConversation(@RequestBody ChatbotConversationRequest request) {
		return ApiResponse.<ChatbotConversationResponse>builder()
				.result(chatbotService.createConversation(request))
				.build();
	}

	@GetMapping("/conversations/{conversationId}")
	public ApiResponse<ChatbotConversationResponse> getConversation(@PathVariable String conversationId) {
		return ApiResponse.<ChatbotConversationResponse>builder()
				.result(chatbotService.getConversation(conversationId))
				.build();
	}

	@GetMapping("/lessons/{lessonId}/conversation")
	public ApiResponse<ChatbotConversationResponse> getLessonConversation(@PathVariable String lessonId) {
		return ApiResponse.<ChatbotConversationResponse>builder()
				.result(chatbotService.getOrCreateLessonConversation(lessonId))
				.build();
	}

	@DeleteMapping("/conversations/{conversationId}")
	public ApiResponse<Void> deleteConversation(@PathVariable String conversationId) {
		chatbotService.deleteConversation(conversationId);
		return ApiResponse.<Void>builder()
				.message("Đã xóa hội thoại")
				.build();
	}

	@PostMapping("/conversations/{conversationId}/messages")
	public ApiResponse<ChatbotMessageResponse> sendMessage(
			@PathVariable String conversationId,
			@RequestBody ChatbotMessageRequest request) {
		return ApiResponse.<ChatbotMessageResponse>builder()
				.result(chatbotService.sendMessage(conversationId, request))
				.build();
	}
}
