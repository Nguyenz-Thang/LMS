package com.nt.lms.repository;

import com.nt.lms.entity.ChatbotMessage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatbotMessageRepository extends JpaRepository<ChatbotMessage, Long> {
	List<ChatbotMessage> findByConversationIdOrderByCreatedAtAsc(String conversationId);

	List<ChatbotMessage> findTop16ByConversationIdOrderByIdDesc(String conversationId);

	long countByConversationId(String conversationId);

	void deleteByConversationId(String conversationId);
}
