package com.nt.lms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nt.lms.dto.request.AiLessonAssistantRequest;
import com.nt.lms.dto.request.ChatbotConversationRequest;
import com.nt.lms.dto.request.ChatbotMessageRequest;
import com.nt.lms.dto.response.AiQuizDraftResponse;
import com.nt.lms.dto.response.AiLessonAssistantResponse;
import com.nt.lms.dto.response.ChatbotConversationResponse;
import com.nt.lms.dto.response.ChatbotMessageResponse;
import com.nt.lms.entity.ChatbotConversation;
import com.nt.lms.entity.ChatbotMessage;
import com.nt.lms.entity.Course;
import com.nt.lms.entity.Lesson;
import com.nt.lms.entity.LessonProgress;
import com.nt.lms.entity.Question;
import com.nt.lms.entity.User;
import com.nt.lms.entity.Quiz;
import com.nt.lms.entity.QuizOption;
import com.nt.lms.enums.ChatbotContextType;
import com.nt.lms.enums.ChatbotSenderType;
import com.nt.lms.repository.ChatbotConversationRepository;
import com.nt.lms.repository.ChatbotMessageRepository;
import com.nt.lms.repository.CourseRepository;
import com.nt.lms.repository.LessonProgressRepository;
import com.nt.lms.repository.LessonRepository;
import com.nt.lms.repository.QuestionRepository;
import com.nt.lms.repository.QuizOptionRepository;
import com.nt.lms.repository.QuizRepository;
import com.nt.lms.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatbotService {
	private final ChatbotConversationRepository conversationRepository;
	private final ChatbotMessageRepository messageRepository;
	private final UserRepository userRepository;
	private final CourseRepository courseRepository;
	private final LessonRepository lessonRepository;
	private final LessonProgressRepository lessonProgressRepository;
	private final QuizRepository quizRepository;
	private final QuestionRepository questionRepository;
	private final QuizOptionRepository quizOptionRepository;
	private final AiLearningService aiLearningService;
	private final ObjectMapper objectMapper;

	private static final int CONTEXT_TEXT_LIMIT = 1200;

	@Value("${lms.frontend-base-url:http://localhost:5173}")
	private String frontendBaseUrl;

	public List<ChatbotConversationResponse> listConversations() {
		User user = getCurrentUser();
		return conversationRepository.findByUserIdOrderByUpdatedAtDesc(user.getId()).stream()
				.filter(conversation -> conversation.getContextType() == ChatbotContextType.GENERAL)
				.map(conversation -> toConversationResponse(conversation, false))
				.toList();
	}

	public ChatbotConversationResponse createConversation(ChatbotConversationRequest request) {
		User user = getCurrentUser();
		ChatbotContextType contextType = request != null && request.getContextType() != null
				? request.getContextType()
				: ChatbotContextType.GENERAL;
		Course course = resolveCourse(request);
		Lesson lesson = resolveLesson(request);

		ChatbotConversation conversation = ChatbotConversation.builder()
				.user(user)
				.contextType(contextType)
				.course(course)
				.lesson(lesson)
				.title(resolveTitle(request, contextType, course, lesson))
				.build();
		return toConversationResponse(conversationRepository.save(conversation), true);
	}

	public ChatbotConversationResponse getConversation(String conversationId) {
		User user = getCurrentUser();
		ChatbotConversation conversation = conversationRepository.findByIdAndUserId(conversationId, user.getId())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hội thoại"));
		return toConversationResponse(conversation, true);
	}

	@Transactional
	public void deleteConversation(String conversationId) {
		User user = getCurrentUser();
		ChatbotConversation conversation = conversationRepository.findByIdAndUserId(conversationId, user.getId())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hội thoại"));
		messageRepository.deleteByConversationId(conversation.getId());
		conversationRepository.delete(conversation);
	}

	public ChatbotConversationResponse getOrCreateLessonConversation(String lessonId) {
		User user = getCurrentUser();
		Lesson lesson = lessonRepository.findById(lessonId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài học"));
		return conversationRepository
				.findFirstByUserIdAndContextTypeAndLessonIdOrderByUpdatedAtDesc(user.getId(), ChatbotContextType.LESSON, lessonId)
				.map(conversation -> toConversationResponse(conversation, true))
				.orElseGet(() -> {
					ChatbotConversation conversation = ChatbotConversation.builder()
							.user(user)
							.contextType(ChatbotContextType.LESSON)
							.course(lesson.getSection() != null ? lesson.getSection().getCourse() : null)
							.lesson(lesson)
							.title("Trợ lý bài học: " + safeTitle(lesson.getTitle()))
							.build();
					return toConversationResponse(conversationRepository.save(conversation), true);
				});
	}

	public ChatbotMessageResponse sendMessage(String conversationId, ChatbotMessageRequest request) {
		User user = getCurrentUser();
		ChatbotConversation conversation = conversationRepository.findByIdAndUserId(conversationId, user.getId())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy hội thoại"));
		if (request == null || !StringUtils.hasText(request.getMessage())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tin nhắn không được để trống");
		}

		String question = request.getMessage().trim();
		ChatbotMessage userMessage = messageRepository.save(ChatbotMessage.builder()
				.conversation(conversation)
				.senderType(ChatbotSenderType.USER)
				.messageText(question)
				.build());

		String personalizedContext = buildPersonalizedContext(user, conversation);
		AiLessonAssistantResponse aiResponse;
		try {
			if (isQuizCreationRequest(question)) {
				aiResponse = createQuizFromChatbot(question, personalizedContext, user);
			} else {
				aiResponse = aiLearningService.answerSmartChat(
						question,
						buildHistory(conversation.getId(), userMessage.getId()),
						personalizedContext,
						conversation.getLesson() != null ? conversation.getLesson().getId() : null);
			}
		} catch (ResponseStatusException exception) {
			log.warn("Chatbot AI fallback activated: conversationId={}, reason={}", conversationId, exception.getReason());
			aiResponse = buildFallbackResponse(question, personalizedContext, conversation, exception);
		}

		ChatbotMessage aiMessage = messageRepository.save(ChatbotMessage.builder()
				.conversation(conversation)
				.senderType(ChatbotSenderType.AI)
				.messageText(StringUtils.hasText(aiResponse.getAnswer())
						? aiResponse.getAnswer()
						: "AI chưa trả về nội dung.")
				.metadataJson(toMetadataJson(aiResponse))
				.build());

		conversation.setUpdatedAt(LocalDateTime.now());
		if (!StringUtils.hasText(conversation.getTitle())
				|| "Hoi thoai moi".equals(conversation.getTitle())
				|| "Hội thoại mới".equals(conversation.getTitle())) {
			conversation.setTitle(createShortTitle(question));
		}
		conversationRepository.save(conversation);

		ChatbotMessageResponse response = toMessageResponse(aiMessage);
		response.setSuggestedQuestions(aiResponse.getSuggestedQuestions());
		response.setModel(aiResponse.getModel());
		return response;
	}

	@Transactional
	protected AiLessonAssistantResponse createQuizFromChatbot(String prompt, String personalizedContext, User user) {
		AiQuizDraftResponse draft = aiLearningService.generateStandaloneQuizDraft(prompt, personalizedContext);
		Quiz quiz = saveGeneratedIndependentQuiz(draft, user);
		String quizUrl = frontendBaseUrl.replaceAll("/+$", "") + "/quizzes/" + quiz.getId() + "/take";
		int questionCount = draft.getQuestions() == null ? 0 : draft.getQuestions().size();
		String answer = "Mình đã tạo và lưu bài quiz tự động cho bạn.\n\n"
				+ "Tên quiz: " + quiz.getTitle() + "\n"
				+ "Số câu hỏi: " + questionCount + "\n"
				+ "Link làm bài: " + quizUrl;

		return AiLessonAssistantResponse.builder()
				.answer(answer)
				.suggestedQuestions(List.of())
				.model(draft.getModel())
				.build();
	}

	private Quiz saveGeneratedIndependentQuiz(AiQuizDraftResponse draft, User user) {
		if (draft.getQuestions() == null || draft.getQuestions().isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI không tạo được câu hỏi hợp lệ");
		}

		Quiz quiz = Quiz.builder()
				.title(safeGeneratedTitle(draft.getTitle()))
				.description(StringUtils.hasText(draft.getDescription())
						? draft.getDescription().trim()
						: "Quiz được tạo tự động từ chatbot AI")
				.maxAttempts(3)
				.isPublished(true)
				.quizScope("INDEPENDENT")
				.createdSource("AI_CHATBOT")
				.createdBy(user)
				.build();
		quiz = quizRepository.saveAndFlush(quiz);

		int questionIndex = 0;
		for (AiQuizDraftResponse.QuestionDraft questionDraft : draft.getQuestions()) {
			if (!StringUtils.hasText(questionDraft.getContent())) {
				continue;
			}
			String questionType = normalizeQuestionType(questionDraft.getQuestionType());
			List<AiQuizDraftResponse.AnswerDraft> answers = normalizeAnswers(questionDraft.getAnswers(), questionType);
			if (answers.size() < 2) {
				continue;
			}

			Question question = Question.builder()
					.quiz(quiz)
					.content(questionDraft.getContent().trim())
					.explanation(StringUtils.hasText(questionDraft.getExplanation()) ? questionDraft.getExplanation().trim() : null)
					.questionType(questionType)
					.points(questionDraft.getPoints() == null || questionDraft.getPoints() <= 0 ? 1 : questionDraft.getPoints())
					.orderIndex(questionDraft.getOrderIndex() == null ? questionIndex : questionDraft.getOrderIndex())
					.createdSource("AI_CHATBOT")
					.createdAt(LocalDateTime.now())
					.build();
			question = questionRepository.saveAndFlush(question);

			int optionIndex = 0;
			for (AiQuizDraftResponse.AnswerDraft answerDraft : answers) {
				quizOptionRepository.save(QuizOption.builder()
						.question(question)
						.optionText(answerDraft.getContent().trim())
						.isCorrect(Boolean.TRUE.equals(answerDraft.getIsCorrect()))
						.orderIndex(optionIndex++)
						.build());
			}
			questionIndex++;
		}

		if (questionIndex == 0) {
			quizRepository.delete(quiz);
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI không tạo được câu hỏi hợp lệ");
		}

		quizOptionRepository.flush();
		return quiz;
	}

	private boolean isQuizCreationRequest(String message) {
		if (!StringUtils.hasText(message)) return false;
		String lower = message.toLowerCase();
		boolean createIntent = lower.contains("tạo") || lower.contains("tao") || lower.contains("sinh") || lower.contains("lập");
		boolean quizIntent = lower.contains("quiz")
				|| lower.contains("bài kiểm tra")
				|| lower.contains("bai kiem tra")
				|| lower.contains("bộ câu hỏi")
				|| lower.contains("bo cau hoi")
				|| lower.contains("câu hỏi")
				|| lower.contains("cau hoi");
		return createIntent && quizIntent;
	}

	private String safeGeneratedTitle(String title) {
		if (!StringUtils.hasText(title)) return "Quiz ôn tập AI";
		String trimmed = title.trim();
		return trimmed.length() > 120 ? trimmed.substring(0, 120) : trimmed;
	}

	private String normalizeQuestionType(String questionType) {
		if ("MULTIPLE_CHOICE".equals(questionType) || "TRUE_FALSE".equals(questionType)) {
			return questionType;
		}
		return "SINGLE_CHOICE";
	}

	private List<AiQuizDraftResponse.AnswerDraft> normalizeAnswers(
			List<AiQuizDraftResponse.AnswerDraft> answers,
			String questionType) {
		List<AiQuizDraftResponse.AnswerDraft> validAnswers = answers == null
				? new ArrayList<>()
				: answers.stream()
						.filter(answer -> answer != null && StringUtils.hasText(answer.getContent()))
						.toList();
		if (validAnswers.size() < 2) {
			return validAnswers;
		}

		long correctCount = validAnswers.stream().filter(answer -> Boolean.TRUE.equals(answer.getIsCorrect())).count();
		if ("MULTIPLE_CHOICE".equals(questionType)) {
			if (correctCount == 0) {
				validAnswers.get(0).setIsCorrect(true);
			}
			return validAnswers;
		}

		if (correctCount != 1) {
			for (int index = 0; index < validAnswers.size(); index++) {
				validAnswers.get(index).setIsCorrect(index == 0);
			}
		}
		if ("TRUE_FALSE".equals(questionType) && validAnswers.size() > 2) {
			return validAnswers.subList(0, 2);
		}
		return validAnswers;
	}

	private List<AiLessonAssistantRequest.ChatHistoryItem> buildHistory(String conversationId, Long newestUserMessageId) {
		List<ChatbotMessage> recent = new ArrayList<>(messageRepository.findTop16ByConversationIdOrderByIdDesc(conversationId));
		Collections.reverse(recent);
		return recent.stream()
				.filter(message -> !message.getId().equals(newestUserMessageId))
				.filter(message -> message.getSenderType() == ChatbotSenderType.USER || message.getSenderType() == ChatbotSenderType.AI)
				.map(message -> AiLessonAssistantRequest.ChatHistoryItem.builder()
						.role(message.getSenderType() == ChatbotSenderType.AI ? "assistant" : "user")
						.content(message.getMessageText())
						.build())
				.toList();
	}

	private String buildPersonalizedContext(User user, ChatbotConversation conversation) {
		StringBuilder builder = new StringBuilder();
		builder.append("Người học: ").append(safeText(user.getFullName(), user.getUsername())).append("\n");
		builder.append("Loại ngữ cảnh: ").append(conversation.getContextType()).append("\n");

		Course course = conversation.getCourse();
		Lesson lesson = conversation.getLesson();
		if (lesson != null) {
			builder.append("Bài học hiện tại: ").append(safeTitle(lesson.getTitle())).append("\n");
			builder.append("Mô tả bài học: ").append(limit(toPlainText(lesson.getDescription()), CONTEXT_TEXT_LIMIT)).append("\n");
			builder.append("Nội dung bài học: ").append(limit(toPlainText(lesson.getContent()), CONTEXT_TEXT_LIMIT)).append("\n");
			if (lesson.getSection() != null && lesson.getSection().getCourse() != null) {
				course = lesson.getSection().getCourse();
			}
			lessonProgressRepository.findByUserIdAndLessonId(user.getId(), lesson.getId()).ifPresent(progress ->
					builder.append("Tiến độ bài học: ")
							.append(Boolean.TRUE.equals(progress.getCompleted()) ? "đã hoàn thành" : "đang học")
							.append(", vị trí gần nhất ")
							.append(progress.getLastPositionSec() == null ? 0 : progress.getLastPositionSec())
							.append(" giây.\n"));
		}

		if (course != null) {
			long totalLessons = lessonRepository.countBySection_Course_Id(course.getId());
			long completedLessons = lessonProgressRepository.countByUserIdAndLesson_Section_Course_IdAndCompletedTrue(
					user.getId(), course.getId());
			builder.append("Khóa học: ").append(safeTitle(course.getTitle())).append("\n");
			builder.append("Mô tả khóa học: ").append(limit(toPlainText(course.getDescription()), CONTEXT_TEXT_LIMIT)).append("\n");
			builder.append("Tiến độ khóa học: ").append(completedLessons).append("/").append(totalLessons).append(" bài đã hoàn thành.\n");
		}

		if (conversation.getContextType() == ChatbotContextType.GENERAL) {
			List<LessonProgress> progressList = lessonProgressRepository.findByUserId(user.getId());
			long completed = progressList.stream().filter(item -> Boolean.TRUE.equals(item.getCompleted())).count();
			builder.append("Tổng quan tiến độ: ").append(completed).append("/")
					.append(progressList.size()).append(" bài có ghi nhận tiến độ đã hoàn thành.\n");
		}

		return builder.toString().trim();
	}

	private AiLessonAssistantResponse buildFallbackResponse(
			String question,
			String personalizedContext,
			ChatbotConversation conversation,
			ResponseStatusException exception) {
		String reason = exception.getReason();
		boolean quotaExceeded = reason != null
				&& (reason.contains("quota")
						|| reason.contains("429")
						|| reason.contains("TOO_MANY_REQUESTS")
						|| reason.contains("RESOURCE_EXHAUSTED"));
		String lowerQuestion = question == null ? "" : question.toLowerCase();
		if (conversation.getContextType() == ChatbotContextType.GENERAL
				&& (lowerQuestion.contains("tiến độ") || lowerQuestion.contains("tien do")
						|| lowerQuestion.contains("tóm tắt") || lowerQuestion.contains("tom tat"))) {
			User user = conversation.getUser();
			List<LessonProgress> progressList = lessonProgressRepository.findByUserId(user.getId());
			long completed = progressList.stream().filter(item -> Boolean.TRUE.equals(item.getCompleted())).count();
			long total = progressList.size();
			long remaining = Math.max(total - completed, 0);
			int percent = total == 0 ? 0 : (int) Math.round((completed * 100.0) / total);
			StringBuilder progressAnswer = new StringBuilder();
			if (quotaExceeded) {
				progressAnswer.append("Gemini API đang hết quota hoặc bị giới hạn tốc độ, nên mình tạm tổng hợp bằng dữ liệu học tập trong hệ thống.\n\n");
			} else {
				progressAnswer.append("Hiện chưa gọi được dịch vụ AI, nên mình tạm tổng hợp bằng dữ liệu học tập trong hệ thống.\n\n");
			}
			progressAnswer.append("Tiến độ của bạn:\n");
			progressAnswer.append("- Đã hoàn thành: ").append(completed).append("/").append(total).append(" bài");
			if (total > 0) {
				progressAnswer.append(" (").append(percent).append("%)");
			}
			progressAnswer.append(".\n");
			progressAnswer.append("- Còn lại: ").append(remaining).append(" bài cần tiếp tục.\n");
			if (total == 0) {
				progressAnswer.append("- Hệ thống chưa ghi nhận tiến độ học tập nào. Hãy bắt đầu một khóa học để có dữ liệu theo dõi.\n");
			} else if (remaining == 0) {
				progressAnswer.append("- Bạn đã hoàn tất toàn bộ bài có ghi nhận tiến độ. Bước tiếp theo hợp lý là làm quiz hoặc xem lại các bài đã đánh dấu.\n");
			} else {
				progressAnswer.append("- Gợi ý: vào trang Tiến độ học hoặc Khóa học của tôi để xem danh sách bài chưa hoàn thành, rồi tiếp tục từ bài gần nhất.\n");
			}

			return AiLessonAssistantResponse.builder()
					.lessonId(null)
					.answer(progressAnswer.toString())
					.suggestedQuestions(List.of(
							"Tôi còn bao nhiêu bài chưa hoàn thành?",
							"Gợi ý kế hoạch ôn tập hôm nay",
							"Tạo danh sách việc cần làm để hoàn thành khóa học"))
					.model(quotaExceeded ? "fallback-quota" : "fallback-local")
					.build();
		}

		StringBuilder answer = new StringBuilder();
		if (quotaExceeded) {
			answer.append("Gemini API đang hết quota hoặc bị giới hạn tốc độ, nên mình chưa thể gọi AI trực tiếp lúc này.\n\n");
		} else {
			answer.append("Hiện chưa gọi được dịch vụ AI, nên mình trả lời tạm theo dữ liệu học tập đang có.\n\n");
		}
		answer.append("Đây là hội thoại tổng quát nên mình không có ngữ cảnh bài học cụ thể. Hiện mình chỉ có thể hỗ trợ các thông tin tổng quan như tiến độ học tập, số bài đã hoàn thành và kế hoạch ôn tập.\n\n");
		answer.append("Bạn có thể hỏi một trong các ý sau:\n");
		answer.append("- Tóm tắt tiến độ học tập của tôi\n");
		answer.append("- Tôi còn bao nhiêu bài chưa hoàn thành?\n");
		answer.append("- Gợi ý kế hoạch ôn tập hôm nay\n\n");
		answer.append("Khi Gemini hoạt động lại, chatbot sẽ trả lời đầy đủ và cá nhân hóa hơn.");

		return AiLessonAssistantResponse.builder()
				.lessonId(conversation.getLesson() != null ? conversation.getLesson().getId() : null)
				.answer(answer.toString())
				.suggestedQuestions(List.of(
						"Tóm tắt tiến độ học tập của tôi",
						"Tôi còn bao nhiêu bài chưa hoàn thành?",
						"Gợi ý kế hoạch ôn tập hôm nay"))
				.model(quotaExceeded ? "fallback-quota" : "fallback-local")
				.build();
	}

	private ChatbotConversationResponse toConversationResponse(ChatbotConversation conversation, boolean includeMessages) {
		List<ChatbotMessageResponse> messages = includeMessages
				? messageRepository.findByConversationIdOrderByCreatedAtAsc(conversation.getId()).stream()
						.map(this::toMessageResponse)
						.toList()
				: null;
		return ChatbotConversationResponse.builder()
				.id(conversation.getId())
				.title(conversation.getTitle())
				.contextType(conversation.getContextType())
				.courseId(conversation.getCourse() != null ? conversation.getCourse().getId() : null)
				.courseTitle(conversation.getCourse() != null ? conversation.getCourse().getTitle() : null)
				.lessonId(conversation.getLesson() != null ? conversation.getLesson().getId() : null)
				.lessonTitle(conversation.getLesson() != null ? conversation.getLesson().getTitle() : null)
				.messageCount(messageRepository.countByConversationId(conversation.getId()))
				.createdAt(conversation.getCreatedAt())
				.updatedAt(conversation.getUpdatedAt())
				.messages(messages)
				.build();
	}

	private ChatbotMessageResponse toMessageResponse(ChatbotMessage message) {
		return ChatbotMessageResponse.builder()
				.id(message.getId())
				.senderType(message.getSenderType())
				.messageText(message.getMessageText())
				.metadataJson(message.getMetadataJson())
				.createdAt(message.getCreatedAt())
				.build();
	}

	private Course resolveCourse(ChatbotConversationRequest request) {
		if (request == null || !StringUtils.hasText(request.getCourseId())) return null;
		return courseRepository.findById(request.getCourseId())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khóa học"));
	}

	private Lesson resolveLesson(ChatbotConversationRequest request) {
		if (request == null || !StringUtils.hasText(request.getLessonId())) return null;
		return lessonRepository.findById(request.getLessonId())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài học"));
	}

	private String resolveTitle(ChatbotConversationRequest request, ChatbotContextType contextType, Course course, Lesson lesson) {
		if (request != null && StringUtils.hasText(request.getTitle())) return request.getTitle().trim();
		if (lesson != null) return "Trợ lý bài học: " + safeTitle(lesson.getTitle());
		if (course != null) return "Trợ lý khóa học: " + safeTitle(course.getTitle());
		return contextType == ChatbotContextType.ADMIN_SUPPORT ? "Hỗ trợ quản trị" : "Hội thoại mới";
	}

	private User getCurrentUser() {
		String username = SecurityContextHolder.getContext().getAuthentication().getName();
		return userRepository.findByUsername(username)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không xác định được người dùng"));
	}

	private String toMetadataJson(AiLessonAssistantResponse response) {
		try {
			Map<String, Object> metadata = new LinkedHashMap<>();
			metadata.put("model", response.getModel());
			metadata.put("suggestedQuestions", response.getSuggestedQuestions());
			return objectMapper.writeValueAsString(metadata);
		} catch (Exception exception) {
			return "{}";
		}
	}

	private String createShortTitle(String question) {
		return limit(question, 64);
	}

	private String safeTitle(String value) {
		return StringUtils.hasText(value) ? value.trim() : "Không có tiêu đề";
	}

	private String safeText(String primary, String fallback) {
		return StringUtils.hasText(primary) ? primary.trim() : fallback;
	}

	private String toPlainText(String html) {
		if (!StringUtils.hasText(html)) return "";
		return html.replaceAll("<[^>]+>", " ").replace("&nbsp;", " ").replaceAll("\\s+", " ").trim();
	}

	private String limit(String value, int maxLength) {
		if (!StringUtils.hasText(value)) return "";
		String trimmed = value.trim();
		return trimmed.length() > maxLength ? trimmed.substring(0, maxLength) : trimmed;
	}
}
