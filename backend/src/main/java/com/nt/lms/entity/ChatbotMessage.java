package com.nt.lms.entity;

import com.nt.lms.enums.ChatbotSenderType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "chatbot_messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatbotMessage {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	Long id;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "conversation_id", nullable = false)
	ChatbotConversation conversation;

	@Enumerated(EnumType.STRING)
	@Column(name = "sender_type", nullable = false)
	ChatbotSenderType senderType;

	@Lob
	@Column(name = "message_text", nullable = false, columnDefinition = "LONGTEXT")
	String messageText;

	@Column(name = "metadata_json", columnDefinition = "JSON")
	String metadataJson;

	@Column(name = "created_at")
	LocalDateTime createdAt;

	@PrePersist
	public void prePersist() {
		if (createdAt == null) createdAt = LocalDateTime.now();
	}
}
