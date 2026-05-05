package com.nt.lms.dto.request;

import com.nt.lms.enums.ChatbotContextType;
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
public class ChatbotConversationRequest {
	String title;
	ChatbotContextType contextType;
	String courseId;
	String lessonId;
}
