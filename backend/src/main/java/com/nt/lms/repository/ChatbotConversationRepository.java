package com.nt.lms.repository;

import com.nt.lms.entity.ChatbotConversation;
import com.nt.lms.enums.ChatbotContextType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatbotConversationRepository extends JpaRepository<ChatbotConversation, String> {
	List<ChatbotConversation> findByUserIdOrderByUpdatedAtDesc(String userId);

	Optional<ChatbotConversation> findByIdAndUserId(String id, String userId);

	Optional<ChatbotConversation> findFirstByUserIdAndContextTypeAndCourseIdOrderByUpdatedAtDesc(
			String userId, ChatbotContextType contextType, String courseId);

	Optional<ChatbotConversation> findFirstByUserIdAndContextTypeAndLessonIdOrderByUpdatedAtDesc(
			String userId, ChatbotContextType contextType, String lessonId);
}
