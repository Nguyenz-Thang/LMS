package com.nt.lms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nt.lms.dto.request.AiLessonAssistantRequest;
import com.nt.lms.dto.request.ChatbotConversationRequest;
import com.nt.lms.dto.request.ChatbotMessageRequest;
import com.nt.lms.dto.response.AiLessonAssistantResponse;
import com.nt.lms.dto.response.ChatbotConversationResponse;
import com.nt.lms.dto.response.ChatbotMessageResponse;
import com.nt.lms.entity.ChatbotConversation;
import com.nt.lms.entity.ChatbotMessage;
import com.nt.lms.entity.Assignment;
import com.nt.lms.entity.Course;
import com.nt.lms.entity.Enrollment;
import com.nt.lms.entity.Lesson;
import com.nt.lms.entity.LessonProgress;
import com.nt.lms.entity.LessonResource;
import com.nt.lms.entity.Question;
import com.nt.lms.entity.Quiz;
import com.nt.lms.entity.QuizOption;
import com.nt.lms.entity.User;
import com.nt.lms.enums.ChatbotContextType;
import com.nt.lms.enums.ChatbotSenderType;
import com.nt.lms.repository.ChatbotConversationRepository;
import com.nt.lms.repository.ChatbotMessageRepository;
import com.nt.lms.repository.AssignmentRepository;
import com.nt.lms.repository.CourseRepository;
import com.nt.lms.repository.EnrollmentRepository;
import com.nt.lms.repository.LessonProgressRepository;
import com.nt.lms.repository.LessonRepository;
import com.nt.lms.repository.LessonResourceRepository;
import com.nt.lms.repository.QuestionRepository;
import com.nt.lms.repository.QuizOptionRepository;
import com.nt.lms.repository.QuizRepository;
import com.nt.lms.repository.SectionRepository;
import com.nt.lms.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
	private final EnrollmentRepository enrollmentRepository;
	private final LessonRepository lessonRepository;
	private final LessonResourceRepository lessonResourceRepository;
	private final AssignmentRepository assignmentRepository;
	private final LessonProgressRepository lessonProgressRepository;
	private final QuizRepository quizRepository;
	private final QuestionRepository questionRepository;
	private final QuizOptionRepository quizOptionRepository;
	private final SectionRepository sectionRepository;
	private final AiLearningService aiLearningService;
	private final ObjectMapper objectMapper;

	private static final int CONTEXT_TEXT_LIMIT = 1200;
	private static final int RECOMMENDED_COURSE_LIMIT = 3;

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

		String personalizedContext = buildPersonalizedContext(user, conversation, question);
		AiLessonAssistantResponse aiResponse;
		try {
			aiResponse = aiLearningService.answerSmartChat(
					question,
					buildHistory(conversation.getId(), userMessage.getId()),
					personalizedContext,
					conversation.getLesson() != null ? conversation.getLesson().getId() : null);
		} catch (ResponseStatusException exception) {
			log.warn("Chatbot AI fallback activated: conversationId={}, reason={}", conversationId, exception.getReason());
			aiResponse = buildFallbackResponse(question, personalizedContext, conversation, user, exception);
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

	private String buildPersonalizedContext(User user, ChatbotConversation conversation, String question) {
		StringBuilder builder = new StringBuilder();
		builder.append("Người học: ").append(safeText(user.getFullName(), user.getUsername())).append("\n");
		builder.append("Loại ngữ cảnh: ").append(conversation.getContextType()).append("\n");

		Course course = conversation.getCourse();
		Lesson lesson = conversation.getLesson();
		if (lesson != null) {
			builder.append("Bài học hiện tại: ").append(safeTitle(lesson.getTitle())).append("\n");
			builder.append("Mô tả bài học: ").append(limit(toPlainText(lesson.getDescription()), CONTEXT_TEXT_LIMIT)).append("\n");
			builder.append("Nội dung bài học: ").append(limit(toPlainText(lesson.getContent()), CONTEXT_TEXT_LIMIT)).append("\n");
			if (StringUtils.hasText(lesson.getVideoUrl())) {
				builder.append("Video bài học: ").append(limit(lesson.getVideoUrl(), 500)).append("\n");
			}
			quizRepository.findFirstByLessonId(lesson.getId())
					.ifPresent(quiz -> {
						builder.append("Quiz gan voi bai hoc:\n");
						appendQuizContext(builder, quiz);
					});
			assignmentRepository.findFirstByLessonId(lesson.getId())
					.ifPresent(assignment -> {
						builder.append("Bai tap gan voi bai hoc:\n");
						appendAssignmentContext(builder, assignment);
					});
			List<LessonResource> lessonResources = lessonResourceRepository.findByLessonIdOrderByCreatedAtAsc(lesson.getId());
			if (!lessonResources.isEmpty()) {
				builder.append("Tài liệu đính kèm:\n");
				for (LessonResource resource : lessonResources) {
					builder.append("- ")
							.append(safeText(resource.getFileName(), "File"))
							.append(" (")
							.append(safeText(resource.getFileType(), "unknown"))
							.append(")\n");
				}
			}
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

			appendEnrolledCourseContext(builder, user);
			if (isCourseRecommendationQuestion(question)) {
				appendRecommendedCourseContext(builder, question, user);
			}
		}

		return builder.toString().trim();
	}

	private void appendEnrolledCourseContext(StringBuilder builder, User user) {
		List<Enrollment> enrollments = enrollmentRepository.findByUserId(user.getId());
		if (enrollments.isEmpty()) {
			builder.append("Khóa học đã đăng ký: chưa có khóa học nào.\n");
			return;
		}

		builder.append("Khóa học người học đã đăng ký:\n");
		enrollments.stream()
				.filter(enrollment -> enrollment.getCourse() != null)
				.limit(5)
				.forEach(enrollment -> builder.append("- ")
						.append(safeTitle(enrollment.getCourse().getTitle()))
						.append(" | tiến độ ")
						.append(enrollment.getProgressPercent() == null ? 0 : enrollment.getProgressPercent())
						.append("% | trạng thái ")
						.append(enrollment.getStatus())
						.append(" | link ")
						.append(buildCourseUrl(enrollment.getCourse()))
						.append("\n"));
	}

	private void appendRecommendedCourseContext(StringBuilder builder, String question, User user) {
		List<Course> courses = findRecommendedCourses(question, user, RECOMMENDED_COURSE_LIMIT);
		if (courses.isEmpty()) {
			builder.append("Khóa học gợi ý theo nhu cầu hiện tại: không tìm thấy khóa học public/published phù hợp trong hệ thống.\n");
			return;
		}

		builder.append("Khóa học gợi ý theo nhu cầu hiện tại, bắt buộc dùng link thật dưới đây nếu tư vấn khóa học:\n");
		for (Course course : courses) {
			builder.append("- ")
					.append(safeTitle(course.getTitle()))
					.append(" | link: ")
					.append(buildCourseUrl(course))
					.append(" | cấp độ: ")
					.append(safeText(course.getLevel(), "Chưa cập nhật"))
					.append(" | học phí: ")
					.append(Boolean.TRUE.equals(course.getPaid()) ? safeText(String.valueOf(course.getPrice()), "0") + " " + safeText(course.getCurrency(), "VND") : "Miễn phí")
					.append(" | giảng viên: ")
					.append(course.getInstructor() == null ? "Chưa cập nhật" : safeText(course.getInstructor().getFullName(), course.getInstructor().getUsername()))
					.append(" | mô tả: ")
					.append(limit(toPlainText(course.getDescription()), 450))
					.append(" | người học sẽ học được: ")
					.append(buildCourseLearningSummary(course))
					.append("\n");
		}
	}

	private void appendQuizContext(StringBuilder builder, Quiz quiz) {
		if (quiz == null) {
			builder.append("Khong tim thay quiz.\n");
			return;
		}
		builder.append("Quiz: ").append(safeTitle(quiz.getTitle())).append("\n");
		builder.append("Mo ta quiz: ").append(limit(toPlainText(quiz.getDescription()), CONTEXT_TEXT_LIMIT)).append("\n");
		List<Question> questions = questionRepository.findByQuizIdOrderByOrderIndexAsc(quiz.getId());
		for (Question question : questions) {
			builder.append("  Cau hoi ")
					.append(question.getOrderIndex() == null ? "" : question.getOrderIndex() + 1)
					.append(": ")
					.append(limit(toPlainText(question.getContent()), CONTEXT_TEXT_LIMIT))
					.append("\n");
			List<QuizOption> options = quizOptionRepository.findByQuestionIdOrderByOrderIndexAsc(question.getId());
			for (QuizOption option : options) {
				builder.append("    - ")
						.append(option.isCorrect() ? "[Dung] " : "")
						.append(limit(toPlainText(option.getOptionText()), 500))
						.append("\n");
			}
			if (StringUtils.hasText(question.getExplanation())) {
				builder.append("    Giai thich: ")
						.append(limit(toPlainText(question.getExplanation()), CONTEXT_TEXT_LIMIT))
						.append("\n");
			}
		}
	}

	private void appendAssignmentContext(StringBuilder builder, Assignment assignment) {
		if (assignment == null) {
			builder.append("Khong tim thay bai tap.\n");
			return;
		}
		builder.append("Bai tap: ").append(safeTitle(assignment.getTitle())).append("\n");
		builder.append("Mo ta/yeu cau: ")
				.append(limit(toPlainText(assignment.getDescription()), CONTEXT_TEXT_LIMIT))
				.append("\n");
		builder.append("Loai bai tap: ").append(safeText(assignment.getAssignmentType(), "")).append("\n");
		if (assignment.getMaxScore() != null) {
			builder.append("Diem toi da: ").append(assignment.getMaxScore()).append("\n");
		}
		if (assignment.getDueAt() != null) {
			builder.append("Han nop: ").append(assignment.getDueAt()).append("\n");
		}
	}

	private AiLessonAssistantResponse buildFallbackResponse(
			String question,
			String personalizedContext,
			ChatbotConversation conversation,
			User user,
			ResponseStatusException exception) {
		String reason = exception.getReason();
		boolean quotaExceeded = reason != null
				&& (reason.contains("quota")
						|| reason.contains("429")
						|| reason.contains("TOO_MANY_REQUESTS")
						|| reason.contains("RESOURCE_EXHAUSTED"));
		boolean temporarilyUnavailable = reason != null
				&& (reason.contains("503")
						|| reason.contains("quá tải")
						|| reason.contains("UNAVAILABLE")
						|| reason.contains("high demand"));
		String lowerQuestion = question == null ? "" : question.toLowerCase();
		if (conversation.getContextType() == ChatbotContextType.GENERAL
				&& isCourseRecommendationQuestion(question)) {
			return buildCourseRecommendationFallback(question, user, temporarilyUnavailable, quotaExceeded);
		}

		if (conversation.getContextType() == ChatbotContextType.GENERAL
				&& (lowerQuestion.contains("tiến độ") || lowerQuestion.contains("tien do")
						|| lowerQuestion.contains("tóm tắt") || lowerQuestion.contains("tom tat"))) {
			List<LessonProgress> progressList = lessonProgressRepository.findByUserId(user.getId());
			long completed = progressList.stream().filter(item -> Boolean.TRUE.equals(item.getCompleted())).count();
			long total = progressList.size();
			long remaining = Math.max(total - completed, 0);
			int percent = total == 0 ? 0 : (int) Math.round((completed * 100.0) / total);
			StringBuilder progressAnswer = new StringBuilder();
			if (temporarilyUnavailable) {
				progressAnswer.append("OpenAI API đang quá tải tạm thời, nên mình tạm tổng hợp bằng dữ liệu học tập trong hệ thống.\n\n");
			} else if (quotaExceeded) {
				progressAnswer.append("OpenAI API đang hết quota hoặc bị giới hạn tốc độ, nên mình tạm tổng hợp bằng dữ liệu học tập trong hệ thống.\n\n");
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
				progressAnswer.append("- Bạn đã hoàn tất toàn bộ bài có ghi nhận tiến độ. Bước tiếp theo hợp lý là xem lại các bài đã đánh dấu hoặc hỏi thêm về nội dung cần ôn.\n");
			} else {
				progressAnswer.append("- Gợi ý: vào trang Tiến độ học hoặc Khóa học của tôi để xem danh sách bài chưa hoàn thành, rồi tiếp tục từ bài gần nhất.\n");
			}

			return AiLessonAssistantResponse.builder()
					.lessonId(null)
					.answer(progressAnswer.toString())
					.suggestedQuestions(List.of(
							"Tôi còn bao nhiêu bài chưa hoàn thành?",
							"Gợi ý kế hoạch ôn tập hôm nay",
							"Tôi nên học tiếp bài nào trong khóa học?"))
					.model(temporarilyUnavailable ? "fallback-unavailable" : quotaExceeded ? "fallback-quota" : "fallback-local")
					.build();
		}

		StringBuilder answer = new StringBuilder();
		if (temporarilyUnavailable) {
			answer.append("OpenAI API đang quá tải tạm thời, nên mình chưa thể gọi AI trực tiếp lúc này.\n\n");
		} else if (quotaExceeded) {
			answer.append("OpenAI API đang hết quota hoặc bị giới hạn tốc độ, nên mình chưa thể gọi AI trực tiếp lúc này.\n\n");
		} else {
			answer.append("Hiện chưa gọi được dịch vụ AI, nên mình trả lời tạm theo dữ liệu học tập đang có.\n\n");
		}
		if (conversation.getContextType() == ChatbotContextType.LESSON && conversation.getLesson() != null) {
			Lesson lesson = conversation.getLesson();
			answer.append("Đây là hội thoại của bài học: ").append(safeTitle(lesson.getTitle())).append(".\n");
			if (StringUtils.hasText(lesson.getDescription())) {
				answer.append("Mô tả: ").append(limit(toPlainText(lesson.getDescription()), 500)).append("\n");
			}
			if (StringUtils.hasText(lesson.getContent())) {
				answer.append("Nội dung chính hiện có trong hệ thống: ")
						.append(limit(toPlainText(lesson.getContent()), 900))
						.append("\n\n");
			}
			answer.append("Khi OpenAI API hoạt động lại, mình sẽ trả lời chi tiết theo toàn bộ nội dung bài, video, block và tài liệu đính kèm.");
		} else {
			answer.append("Đây là hội thoại tổng quát nên mình không có ngữ cảnh bài học cụ thể. Hiện mình chỉ có thể hỗ trợ các thông tin tổng quan như tiến độ học tập, số bài đã hoàn thành và kế hoạch ôn tập.\n\n");
			answer.append("Bạn có thể hỏi một trong các ý sau:\n");
			answer.append("- Tóm tắt tiến độ học tập của tôi\n");
			answer.append("- Tôi còn bao nhiêu bài chưa hoàn thành?\n");
			answer.append("- Gợi ý kế hoạch ôn tập hôm nay\n\n");
			answer.append("Khi OpenAI API hoạt động lại, chatbot sẽ trả lời đầy đủ và cá nhân hóa hơn.");
		}

		return AiLessonAssistantResponse.builder()
				.lessonId(conversation.getLesson() != null ? conversation.getLesson().getId() : null)
				.answer(answer.toString())
				.suggestedQuestions(List.of(
						"Tóm tắt tiến độ học tập của tôi",
						"Tôi còn bao nhiêu bài chưa hoàn thành?",
						"Gợi ý kế hoạch ôn tập hôm nay"))
				.model(temporarilyUnavailable ? "fallback-unavailable" : quotaExceeded ? "fallback-quota" : "fallback-local")
				.build();
	}

	private AiLessonAssistantResponse buildCourseRecommendationFallback(
			String question,
			User user,
			boolean temporarilyUnavailable,
			boolean quotaExceeded) {
		List<Course> courses = findRecommendedCourses(question, user, 2);
		StringBuilder answer = new StringBuilder();

		if (temporarilyUnavailable) {
			answer.append("OpenAI API đang quá tải tạm thời, nên mình gợi ý bằng dữ liệu khóa học trong hệ thống.\n\n");
		} else if (quotaExceeded) {
			answer.append("OpenAI API đang hết quota hoặc bị giới hạn tốc độ, nên mình gợi ý bằng dữ liệu khóa học trong hệ thống.\n\n");
		} else {
			answer.append("Hiện chưa gọi được dịch vụ AI, nên mình gợi ý bằng dữ liệu khóa học trong hệ thống.\n\n");
		}

		if (courses.isEmpty()) {
			answer.append("Mình chưa tìm thấy khóa học public phù hợp với nhu cầu này. Bạn có thể thử hỏi cụ thể hơn, ví dụ: lập trình Java, lập trình web, dữ liệu, an ninh mạng.");
		} else {
			answer.append("Dựa trên nhu cầu của bạn, các khóa học nên xem trước là:\n");
			for (int index = 0; index < courses.size(); index++) {
				Course course = courses.get(index);
				answer.append(index + 1)
						.append(". ")
						.append(safeTitle(course.getTitle()))
						.append("\n")
						.append("   - Link học: ")
						.append(buildCourseUrl(course))
						.append("\n")
						.append("   - Lý do phù hợp: nội dung khóa học khớp với nhu cầu bạn vừa nêu");
				if (StringUtils.hasText(course.getLevel())) {
					answer.append(", cấp độ ").append(course.getLevel());
				}
				answer.append(".\n");
				if (StringUtils.hasText(course.getDescription())) {
					answer.append("   - Mô tả ngắn: ")
							.append(limit(toPlainText(course.getDescription()), 240))
							.append("\n");
				}
				answer.append("   - Bạn sẽ học được: ")
						.append(buildCourseLearningSummary(course))
						.append("\n");
			}
			answer.append("\nThứ tự học đề xuất: bắt đầu với khóa nhập môn/cấp độ BEGINNER trước, sau đó chuyển sang khóa thực hành hoặc chuyên sâu hơn.");
		}

		return AiLessonAssistantResponse.builder()
				.lessonId(null)
				.answer(answer.toString())
				.suggestedQuestions(List.of(
						"Gợi ý lộ trình học theo thứ tự cho tôi",
						"Tôi nên học khóa miễn phí hay trả phí trước?",
						"Tìm khóa học phù hợp cho người mới bắt đầu"))
				.model(temporarilyUnavailable ? "fallback-unavailable" : quotaExceeded ? "fallback-quota" : "fallback-local")
				.build();
	}

	private boolean isCourseRecommendationQuestion(String question) {
		String normalized = normalizeSearchText(question);
		if (!StringUtils.hasText(normalized)) {
			return false;
		}

		return normalized.contains("khoa hoc")
				|| normalized.contains("hoc khoa nao")
				|| normalized.contains("nen hoc")
				|| normalized.contains("goi y")
				|| normalized.contains("lo trinh")
				|| normalized.contains("link de hoc")
				|| normalized.contains("link hoc")
				|| normalized.contains("cong nghe thong tin")
				|| normalized.contains("lap trinh")
				|| normalized.contains("it");
	}

	private List<Course> findRecommendedCourses(String question, User user, int limit) {
		Set<String> enrolledCourseIds = new HashSet<>();
		enrollmentRepository.findByUserId(user.getId()).stream()
				.filter(enrollment -> enrollment.getCourse() != null)
				.map(enrollment -> enrollment.getCourse().getId())
				.forEach(enrolledCourseIds::add);

		List<String> tokens = extractSearchTokens(question);
		boolean broadItIntent = normalizeSearchText(question).contains("cong nghe thong tin")
				|| normalizeSearchText(question).contains("it");

		return courseRepository.findAll().stream()
				.filter(this::isPublishedPublicCourse)
				.map(course -> Map.entry(course, scoreCourse(course, tokens, broadItIntent, enrolledCourseIds)))
				.filter(entry -> entry.getValue() > 0)
				.sorted(Map.Entry.<Course, Integer>comparingByValue(Comparator.reverseOrder())
						.thenComparing(entry -> enrollmentRepository.countByCourseId(entry.getKey().getId()), Comparator.reverseOrder())
						.thenComparing(entry -> safeTitle(entry.getKey().getTitle())))
				.limit(Math.max(1, limit))
				.map(Map.Entry::getKey)
				.toList();
	}

	private int scoreCourse(Course course, List<String> tokens, boolean broadItIntent, Set<String> enrolledCourseIds) {
		String searchable = normalizeSearchText(String.join(" ",
				safeText(course.getTitle(), ""),
				safeText(course.getDescription(), ""),
				safeText(course.getLevel(), ""),
				course.getCategory() == null ? "" : safeText(course.getCategory().getName(), ""),
				course.getInstructor() == null ? "" : safeText(course.getInstructor().getFullName(), course.getInstructor().getUsername())));

		int score = broadItIntent ? 1 : 0;
		for (String token : tokens) {
			if (searchable.contains(token)) {
				score += token.length() >= 6 ? 3 : 2;
			}
		}

		if (enrolledCourseIds.contains(course.getId())) {
			score -= 2;
		}
		if ("BEGINNER".equalsIgnoreCase(course.getLevel())) {
			score += 1;
		}
		return score;
	}

	private List<String> extractSearchTokens(String question) {
		String normalized = normalizeSearchText(question);
		List<String> tokens = new ArrayList<>();
		for (String token : normalized.split("\\s+")) {
			if (token.length() >= 3 && !List.of("toi", "ban", "hoc", "nen", "khoa", "nao", "cho", "voi", "link").contains(token)) {
				tokens.add(token);
			}
		}
		if (normalized.contains("lap trinh")) {
			tokens.addAll(List.of("lap trinh", "java", "web", "frontend", "backend", "android"));
		}
		if (normalized.contains("du lieu")) {
			tokens.addAll(List.of("du lieu", "data", "sql", "database"));
		}
		return tokens;
	}

	private boolean isPublishedPublicCourse(Course course) {
		return course != null
				&& "PUBLISHED".equalsIgnoreCase(course.getStatus())
				&& "PUBLIC".equalsIgnoreCase(course.getVisibility());
	}

	private String buildCourseUrl(Course course) {
		String baseUrl = StringUtils.hasText(frontendBaseUrl) ? frontendBaseUrl.trim() : "http://localhost:5173";
		return baseUrl.replaceAll("/+$", "") + "/courses/" + course.getId();
	}

	private String buildCourseLearningSummary(Course course) {
		List<String> lessonTitles = sectionRepository.findByCourseIdOrderByOrderIndexAsc(course.getId()).stream()
				.flatMap(section -> lessonRepository.findBySectionIdOrderByOrderIndexAsc(section.getId()).stream())
				.map(Lesson::getTitle)
				.filter(StringUtils::hasText)
				.limit(3)
				.map(this::safeTitle)
				.toList();

		if (!lessonTitles.isEmpty()) {
			return String.join("; ", lessonTitles);
		}

		String description = limit(toPlainText(course.getDescription()), 320);
		return StringUtils.hasText(description)
				? description
				: "Hệ thống chưa cập nhật chi tiết nội dung học cho khóa này.";
	}

	private String normalizeSearchText(String value) {
		if (!StringUtils.hasText(value)) {
			return "";
		}
		String normalized = java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
				.replaceAll("\\p{M}", "")
				.replace("đ", "d")
				.replace("Đ", "D")
				.toLowerCase();
		return normalized.replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
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
