package com.nt.lms.dto.response;

import com.nt.lms.enums.ChatbotContextType;
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
public class ChatbotConversationResponse {
	String id;
	String title;
	ChatbotContextType contextType;
	String courseId;
	String courseTitle;
	String lessonId;
	String lessonTitle;
	Long messageCount;
	LocalDateTime createdAt;
	LocalDateTime updatedAt;
	List<ChatbotMessageResponse> messages;
}
