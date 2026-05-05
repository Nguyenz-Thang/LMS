package com.nt.lms.dto.response;

import com.nt.lms.enums.ChatbotSenderType;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatbotMessageResponse {
	Long id;
	ChatbotSenderType senderType;
	String messageText;
	String metadataJson;
	LocalDateTime createdAt;
	List<String> suggestedQuestions;
	String model;
}
