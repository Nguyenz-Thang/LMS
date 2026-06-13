package com.nt.lms.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.nt.lms.dto.request.AiLessonAssistantRequest;
import com.nt.lms.dto.response.AiLessonAssistantResponse;
import com.nt.lms.entity.Lesson;
import com.nt.lms.entity.LessonResource;
import com.nt.lms.entity.Assignment;
import com.nt.lms.entity.Question;
import com.nt.lms.entity.Quiz;
import com.nt.lms.entity.QuizOption;
import com.nt.lms.entity.User;
import com.nt.lms.repository.LessonRepository;
import com.nt.lms.repository.LessonResourceRepository;
import com.nt.lms.repository.AssignmentRepository;
import com.nt.lms.repository.QuestionRepository;
import com.nt.lms.repository.QuizOptionRepository;
import com.nt.lms.repository.QuizRepository;
import com.nt.lms.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiLearningService {

	private final ObjectMapper objectMapper;
	private final LessonRepository lessonRepository;
	private final LessonResourceRepository lessonResourceRepository;
	private final QuizRepository quizRepository;
	private final QuestionRepository questionRepository;
	private final QuizOptionRepository quizOptionRepository;
	private final AssignmentRepository assignmentRepository;
	private final UserRepository userRepository;

	@Value("${openai.api-key:}")
	private String openaiApiKey;

	@Value("${openai.base-url:https://api.openai.com/v1}")
	private String openaiBaseUrl;

	@Value("${openai.model:gpt-4o-mini}")
	private String openaiModel;

	private static final int LESSON_CONTEXT_LIMIT = 6000;
	private static final int LESSON_TEXT_LIMIT = 1200;
	private static final int VIDEO_TRANSCRIPT_CONTEXT_LIMIT = 3500;
	private static final int CHAT_HISTORY_LIMIT = 12;
	private static final int CHAT_HISTORY_CONTENT_LIMIT = 900;
	private static final int ASSISTANT_OUTPUT_TOKEN_LIMIT = 2200;
	private static final long[] OPENAI_RETRY_DELAYS_MS = {800L, 1600L};

	@PostConstruct
	void logOpenAiConfig() {
		log.info(
				"OpenAI config loaded: baseUrl={}, model={}, apiKeyConfigured={}",
				StringUtils.hasText(openaiBaseUrl) ? openaiBaseUrl.trim() : "",
				getNormalizedModel(),
				StringUtils.hasText(openaiApiKey));
	}

	public AiLessonAssistantResponse answerLessonQuestion(String lessonId, AiLessonAssistantRequest request, String username) {
		validateApiKey();
		Lesson lesson = getLessonOrThrow(lessonId);
		User user = getUserOrThrow(username);

		if (request == null || !StringUtils.hasText(request.getMessage())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Câu hỏi không được để trống");
		}

		String lessonContext = buildLessonContext(lesson);
		Map<String, Object> schema = createLessonAssistantSchema();
		List<Map<String, Object>> input = buildLessonAssistantInput(request, user, lessonContext);

		JsonNode responseNode = callOpenAiApi(
				buildOpenAiChatRequest(
						"Bạn là trợ lý học tập thông minh cho hệ thống LMS. "
								+ "Chỉ được trả lời dựa trên nội dung bài học đã cung cấp. "
								+ "Nếu câu hỏi nằm ngoài bài học, hãy nói rõ rằng thông tin không có trong bài. "
								+ "Trả lời bằng tiếng Việt ngắn gọn, dễ hiểu, có cấu trúc. "
								+ "Tạo thêm 3 câu hỏi gợi ý để học tiếp.\n\n"
								+ "Người học hiện tại: " + user.getUsername() + ".\n"
								+ "Đây là ngữ cảnh bài học:\n" + lessonContext,
						input,
						schema,
						"lesson_assistant_response",
						ASSISTANT_OUTPUT_TOKEN_LIMIT));

		JsonNode payload = parseJsonPayload(extractOutputText(responseNode));
		List<String> suggestedQuestions = new ArrayList<>();
		JsonNode suggestedNode = payload.path("suggestedQuestions");
		if (suggestedNode.isArray()) {
			suggestedNode.forEach(item -> {
				if (item.isTextual() && StringUtils.hasText(item.asText())) {
					suggestedQuestions.add(item.asText().trim());
				}
			});
		}

		String answer = buildDisplayAnswer(
				payload.path("answer").asText(""),
				suggestedQuestions);

		return AiLessonAssistantResponse.builder()
				.lessonId(lessonId)
				.answer(answer)
				.suggestedQuestions(suggestedQuestions)
				.model(getNormalizedModel())
				.build();
	}

	public AiLessonAssistantResponse answerSmartChat(
			String messageText,
			List<AiLessonAssistantRequest.ChatHistoryItem> history,
			String systemContext,
			String lessonId) {
		validateApiKey();
		if (!StringUtils.hasText(messageText)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Câu hỏi không được để trống");
		}

		AiLessonAssistantRequest request = AiLessonAssistantRequest.builder()
				.message(messageText)
				.history(history == null ? List.of() : history)
				.build();
		List<Map<String, Object>> input = buildLessonAssistantInput(request, null, systemContext);
		JsonNode responseNode = callOpenAiApi(
				buildOpenAiChatRequest(
						"Bạn là chatbot AI hỗ trợ học tập thông minh trong hệ thống LMS. "
								+ "Luôn đọc lịch sử hội thoại trước khi trả lời. Nếu câu hỏi mới dùng đại từ hoặc cụm mơ hồ như 'trong này', 'cái này', 'này', hãy hiểu nó theo câu hỏi gần nhất của người học. "
								+ "Hãy cá nhân hóa câu trả lời dựa trên tiến độ, khóa học, bài học và lịch sử hội thoại nếu có. "
								+ "Nếu ngữ cảnh có mục 'Khóa học gợi ý theo nhu cầu hiện tại', khi người học hỏi nên học khóa nào, gợi ý khóa học, lộ trình hoặc xin link học, bắt buộc dùng các khóa học và link thật trong mục đó; không được nói rằng bạn không thể cung cấp link nếu link đã có trong ngữ cảnh. "
								+ "Với câu hỏi tư vấn khóa học, trả lời thật gọn: mở đầu 1 câu ngắn, sau đó gợi ý tối đa 2 khóa phù hợp nhất. Mỗi khóa chỉ gồm 4 dòng: tên khóa, Link học, Bạn sẽ học được gì tối đa 2 ý ngắn, Lý do phù hợp 1 câu. Không lặp lại cùng một nội dung ở nhiều khóa. Cuối câu trả lời thêm 1 câu ngắn về thứ tự học. "
								+ "Không bịa khóa học hoặc link ngoài danh sách được cung cấp trong ngữ cảnh. Nếu danh sách khóa học gợi ý rỗng, hãy nói rõ hệ thống chưa có khóa phù hợp và hỏi thêm nhu cầu. "
								+ "Định dạng câu trả lời gọn: không dùng markdown **, không dùng bullet lồng nhau, không tách riêng dòng chỉ có dấu chấm hoặc dấu gạch đầu dòng. Không viết '(link: ...)', hãy viết 'Link học: ...'. "
								+ "Chỉ trả lời các câu hỏi liên quan đến khóa học, bài học, tiến độ học tập và nội dung học trong hệ thống. "
								+ "Không tạo quiz, không lưu quiz, không sinh đề kiểm tra mới; nếu người học yêu cầu tạo quiz hoặc đề kiểm tra, hãy nói rõ chatbot hiện chỉ hỗ trợ hỏi đáp về khóa học và bài học. "
								+ "Nếu thiếu dữ liệu để xác định chính xác bài học cụ thể, nói rõ giới hạn đó và đề xuất nơi người học có thể xem danh sách bài chưa hoàn thành. "
								+ "Trường answer phải chứa câu trả lời đầy đủ để hiển thị trực tiếp cho người học; không được đặt nội dung chính vào suggestedQuestions. "
								+ "Trường suggestedQuestions chỉ dùng cho các câu hỏi tiếp theo ngắn gọn, không dùng để chứa đáp án hoặc danh sách bài tập. "
								+ "Trả lời bằng tiếng Việt, ngắn gọn, có cấu trúc, ưu tiên hành động học tập cụ thể.\n\n"
								+ systemContext,
						input,
						createLessonAssistantSchema(),
						"smart_chat_response",
						ASSISTANT_OUTPUT_TOKEN_LIMIT));

		JsonNode payload = parseJsonPayload(extractOutputText(responseNode));
		List<String> suggestedQuestions = new ArrayList<>();
		JsonNode suggestedNode = payload.path("suggestedQuestions");
		if (suggestedNode.isArray()) {
			suggestedNode.forEach(item -> {
				if (item.isTextual() && StringUtils.hasText(item.asText())) {
					suggestedQuestions.add(item.asText().trim());
				}
			});
		}

		String answer = buildDisplayAnswer(
				normalizeAssistantAnswer(payload.path("answer").asText("")),
				suggestedQuestions);

		return AiLessonAssistantResponse.builder()
				.lessonId(lessonId)
				.answer(answer)
				.suggestedQuestions(suggestedQuestions)
				.model(getNormalizedModel())
				.build();
	}

	private String buildDisplayAnswer(String answer, List<String> suggestedQuestions) {
		String trimmedAnswer = StringUtils.hasText(answer) ? answer.trim() : "";
		if (trimmedAnswer.matches("(?is).*dưới đây là\\s*(một số\\s*)?(các\\s*)?(câu hỏi|bài tập|gợi ý).*:?\\s*$")
				&& suggestedQuestions != null
				&& !suggestedQuestions.isEmpty()) {
			StringBuilder builder = new StringBuilder(trimmedAnswer);
			for (int index = 0; index < suggestedQuestions.size(); index++) {
				builder.append("\n").append(index + 1).append(". ").append(suggestedQuestions.get(index));
			}
			return builder.toString();
		}
		return trimmedAnswer;
	}

	private String normalizeAssistantAnswer(String answer) {
		if (!StringUtils.hasText(answer)) {
			return "";
		}
		String normalized = answer.trim()
				.replaceAll("\\s+(?=(?:Link|Link học|Bạn sẽ học được gì|Lý do phù hợp):)", "\n")
				.replaceAll("(?<=[.!?])\\s+(?=\\d+\\.\\s)", "\n\n")
				.replaceAll("\\n{3,}", "\n\n");
		return limitText(normalized, ASSISTANT_OUTPUT_TOKEN_LIMIT);
	}

	private Map<String, Object> createLessonAssistantSchema() {
		Map<String, Object> schema = new LinkedHashMap<>();
		schema.put("type", "object");
		schema.put("properties", Map.of(
				"answer", Map.of("type", "string"),
				"suggestedQuestions", Map.of("type", "array", "items", Map.of("type", "string"))));
		schema.put("required", List.of("answer", "suggestedQuestions"));
		schema.put("additionalProperties", false);
		return schema;
	}

	private List<Map<String, Object>> buildLessonAssistantInput(
			AiLessonAssistantRequest request,
			User user,
			String lessonContext) {
		List<Map<String, Object>> input = new ArrayList<>();
		List<AiLessonAssistantRequest.ChatHistoryItem> history = request.getHistory() == null ? List.of() : request.getHistory();
		for (AiLessonAssistantRequest.ChatHistoryItem item : history.stream().limit(CHAT_HISTORY_LIMIT).toList()) {
			if (item == null || !StringUtils.hasText(item.getContent())) {
				continue;
			}
			String role = "assistant".equalsIgnoreCase(item.getRole()) ? "assistant" : "user";
			input.add(message(role, limitText(item.getContent().trim(), CHAT_HISTORY_CONTENT_LIMIT)));
		}

		input.add(message("user", request.getMessage().trim()));
		return input;
	}

	private Lesson getLessonOrThrow(String lessonId) {
		return lessonRepository.findById(lessonId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài học"));
	}

	private User getUserOrThrow(String username) {
		return userRepository.findByUsername(username)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không xác định được người dùng"));
	}

	private void validateApiKey() {
		if (!StringUtils.hasText(openaiApiKey)) {
			throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Chưa cấu hình OPENAI_API_KEY");
		}
	}

	private String getNormalizedModel() {
		return StringUtils.hasText(openaiModel) ? openaiModel.trim() : "gpt-4o-mini";
	}

	private JsonNode callOpenAiApi(Map<String, Object> requestBody) {
		try {
			RestClient client = RestClient.builder()
					.baseUrl(openaiBaseUrl.trim())
					.defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
					.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + openaiApiKey.trim())
					.build();

			RestClientResponseException lastTransientException = null;
			for (int attempt = 0; attempt <= OPENAI_RETRY_DELAYS_MS.length; attempt++) {
				try {
					log.info("Calling OpenAI API: model={}, baseUrl={}, attempt={}", getNormalizedModel(), openaiBaseUrl.trim(), attempt + 1);
					String rawBody = client.post()
							.uri("/chat/completions")
							.body(requestBody)
							.retrieve()
							.body(String.class);

					return objectMapper.readTree(rawBody);
				} catch (RestClientResponseException exception) {
					log.warn(
							"OpenAI API returned error: model={}, status={}, body={}",
							getNormalizedModel(),
							exception.getStatusCode(),
							exception.getResponseBodyAsString());
					if (!isOpenAiTemporarilyUnavailable(exception) || attempt >= OPENAI_RETRY_DELAYS_MS.length) {
						throw exception;
					}
					lastTransientException = exception;
					sleepBeforeRetry(OPENAI_RETRY_DELAYS_MS[attempt]);
				}
			}
			throw lastTransientException;
		} catch (RestClientResponseException exception) {
			throw mapOpenAiError(exception);
		} catch (ResponseStatusException exception) {
			log.warn("OpenAI API call aborted: model={}, reason={}", getNormalizedModel(), exception.getReason());
			throw exception;
		} catch (Exception exception) {
			log.warn("OpenAI API call failed: model={}, message={}", getNormalizedModel(), exception.getMessage(), exception);
			throw new ResponseStatusException(
					HttpStatus.BAD_GATEWAY,
					"Không thể gọi OpenAI API: " + exception.getMessage(),
					exception);
		}
	}

	private boolean isOpenAiTemporarilyUnavailable(RestClientResponseException exception) {
		return exception.getStatusCode().value() == 503
				|| exception.getStatusCode().value() == 502
				|| exception.getStatusCode().value() == 504;
	}

	private void sleepBeforeRetry(long delayMs) {
		try {
			Thread.sleep(delayMs);
		} catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "OpenAI API retry bị gián đoạn", exception);
		}
	}

	private String extractOutputText(JsonNode responseNode) {
		if (responseNode == null || responseNode.isMissingNode()) {
			return "";
		}
		JsonNode choicesNode = responseNode.path("choices");
		if (!choicesNode.isArray() || choicesNode.isEmpty()) {
			return "";
		}
		JsonNode contentNode = choicesNode.get(0).path("message").path("content");
		if (contentNode.isTextual()) {
			return contentNode.asText("");
		}
		if (contentNode.isArray()) {
			StringBuilder builder = new StringBuilder();
			for (JsonNode item : contentNode) {
				if (item.hasNonNull("text")) {
					builder.append(item.path("text").asText(""));
				}
			}
			return builder.toString();
		}
		return "";
	}

	private JsonNode parseJsonPayload(String text) {
		String normalizedText = normalizeJsonText(text);
		try {
			return objectMapper.readTree(normalizedText);
		} catch (Exception exception) {
			try {
				return objectMapper.copy()
						.configure(JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS.mappedFeature(), true)
						.readTree(normalizedText);
			} catch (Exception ignored) {
				// Continue with extraction fallback.
			}
			int start = normalizedText.indexOf('{');
			int end = normalizedText.lastIndexOf('}');
			if (start >= 0 && end > start) {
				try {
					String jsonSlice = normalizedText.substring(start, end + 1);
					return objectMapper.copy()
							.configure(JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS.mappedFeature(), true)
							.readTree(jsonSlice);
				} catch (Exception ignored) {
					// Fall through to the structured error below with the raw preview.
				}
			}
			log.warn("OpenAI returned non-JSON output: {}", toLogPreview(normalizedText));
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI trả về JSON không hợp lệ", exception);
		}
	}

	private String toLogPreview(String value) {
		return limitText(value, 1000)
				.replace("\\", "\\\\")
				.replace("\r", "\\r")
				.replace("\n", "\\n");
	}

	private String normalizeJsonText(String text) {
		if (!StringUtils.hasText(text)) {
			return "";
		}
		String normalized = text.trim();
		if (normalized.startsWith("```")) {
			normalized = normalized
					.replaceFirst("^```(?:json|JSON)?\\s*", "")
					.replaceFirst("\\s*```$", "")
					.trim();
		}
		return normalized;
	}

	private Map<String, Object> message(String role, String content) {
		return Map.of(
				"role", role,
				"content", content);
	}

	private Map<String, Object> buildOpenAiChatRequest(
			String systemInstruction,
			List<Map<String, Object>> messages,
			Map<String, Object> schema,
			String schemaName,
			int maxOutputTokens) {
		List<Map<String, Object>> requestMessages = new ArrayList<>();
		requestMessages.add(message("system", systemInstruction));
		requestMessages.addAll(messages);

		return Map.of(
				"model", getNormalizedModel(),
				"messages", requestMessages,
				"max_completion_tokens", maxOutputTokens,
				"response_format", Map.of(
						"type", "json_schema",
						"json_schema", Map.of(
								"name", schemaName,
								"strict", true,
								"schema", schema)));
	}

	private ResponseStatusException mapOpenAiError(RestClientResponseException exception) {
		String responseBody = exception.getResponseBodyAsString();
		if (exception.getStatusCode().value() == 404) {
			return new ResponseStatusException(
					HttpStatus.BAD_GATEWAY,
					"Không tìm thấy model OpenAI '" + getNormalizedModel()
							+ "'. Hãy kiểm tra OPENAI_MODEL hoặc quyền truy cập model của API key.",
					exception);
		}
		if (exception.getStatusCode().value() == 429) {
			return new ResponseStatusException(
					HttpStatus.BAD_GATEWAY,
					"OpenAI API đã hết quota hoặc đang bị giới hạn tốc độ. Vui lòng đợi ít phút, kiểm tra billing/quota hoặc đổi API key.",
					exception);
		}
		if (exception.getStatusCode().value() == 503
				|| exception.getStatusCode().value() == 502
				|| exception.getStatusCode().value() == 504) {
			return new ResponseStatusException(
					HttpStatus.BAD_GATEWAY,
					"OpenAI API đang quá tải tạm thời. Vui lòng thử lại sau ít phút.",
					exception);
		}
		if (responseBody != null && responseBody.contains("insufficient_quota")) {
			return new ResponseStatusException(
					HttpStatus.BAD_GATEWAY,
					"Tài khoản OpenAI API hiện không đủ quota hoặc billing chưa được bật",
					exception);
		}
		if (exception.getStatusCode().value() == 401 || responseBody != null && responseBody.contains("invalid_api_key")) {
			return new ResponseStatusException(
					HttpStatus.BAD_GATEWAY,
					"OPENAI_API_KEY không hợp lệ",
					exception);
		}
		if (exception.getStatusCode().value() == 403) {
			return new ResponseStatusException(
					HttpStatus.BAD_GATEWAY,
					"OpenAI API từ chối truy cập. Kiểm tra API key, project và quyền truy cập model",
					exception);
		}
		return new ResponseStatusException(
				HttpStatus.BAD_GATEWAY,
				"Không thể gọi OpenAI API: " + exception.getStatusCode() + " " + responseBody,
				exception);
	}

	private String buildLessonContext(Lesson lesson) {
		StringBuilder builder = new StringBuilder();
		builder.append("Tiêu đề bài học: ").append(safeText(lesson.getTitle())).append("\n");
		builder.append("Mô tả: ").append(safeText(lesson.getDescription())).append("\n");
		builder.append("Nội dung chính: ").append(safeText(toPlainText(lesson.getContent()))).append("\n");

		if (StringUtils.hasText(lesson.getVideoUrl())) {
			builder.append("Video URL: ").append(safeText(lesson.getVideoUrl())).append("\n");
		}
		if (StringUtils.hasText(lesson.getVideoTranscript())) {
			builder.append("Noi dung transcript video: ")
					.append(limitText(toPlainText(lesson.getVideoTranscript()), VIDEO_TRANSCRIPT_CONTEXT_LIMIT))
					.append("\n");
		}

		quizRepository.findFirstByLessonId(lesson.getId())
				.ifPresent(quiz -> {
					builder.append("Quiz gắn trực tiếp với bài học:\n");
					appendQuizContext(builder, quiz);
					builder.append("\n");
				});

		assignmentRepository.findFirstByLessonId(lesson.getId())
				.ifPresent(assignment -> {
					builder.append("Bài tập gắn với bài học:\n");
					appendAssignmentContext(builder, assignment);
					builder.append("\n");
				});

		List<LessonResource> resources = lessonResourceRepository.findByLessonIdOrderByCreatedAtAsc(lesson.getId());
		if (!resources.isEmpty()) {
			builder.append("Tài liệu bổ trợ:\n");
			for (LessonResource resource : resources) {
				builder.append("- ")
						.append(safeText(resource.getFileName()))
						.append(" (")
						.append(safeText(resource.getFileType()))
						.append(")\n");
			}
		}

		String context = builder.toString().trim();
		return limitText(context, LESSON_CONTEXT_LIMIT);
	}

	private String toPlainText(String html) {
		if (!StringUtils.hasText(html)) {
			return "";
		}
		return html.replaceAll("<[^>]+>", " ")
				.replace("&nbsp;", " ")
				.replaceAll("\\s+", " ")
				.trim();
	}

	private void appendQuizContext(StringBuilder builder, Quiz quiz) {
		if (quiz == null) {
			builder.append("Không tìm thấy quiz.");
			return;
		}
		builder.append("Quiz: ").append(safeText(quiz.getTitle())).append("\n");
		builder.append("Mô tả quiz: ").append(safeText(toPlainText(quiz.getDescription()))).append("\n");
		List<Question> questions = questionRepository.findByQuizIdOrderByOrderIndexAsc(quiz.getId());
		for (Question question : questions) {
			builder.append("  Câu hỏi ")
					.append(question.getOrderIndex() == null ? "" : question.getOrderIndex() + 1)
					.append(": ")
					.append(safeText(toPlainText(question.getContent())))
					.append("\n");
			List<QuizOption> options = quizOptionRepository.findByQuestionIdOrderByOrderIndexAsc(question.getId());
			for (QuizOption option : options) {
				builder.append("    - ")
						.append(Boolean.TRUE.equals(option.isCorrect()) ? "[Đúng] " : "")
						.append(safeText(toPlainText(option.getOptionText())))
						.append("\n");
			}
			if (StringUtils.hasText(question.getExplanation())) {
				builder.append("    Giải thích: ")
						.append(safeText(toPlainText(question.getExplanation())))
						.append("\n");
			}
		}
	}

	private void appendAssignmentContext(StringBuilder builder, Assignment assignment) {
		if (assignment == null) {
			builder.append("Không tìm thấy bài tập.");
			return;
		}
		builder.append("Bài tập: ").append(safeText(assignment.getTitle())).append("\n");
		builder.append("Mô tả/yêu cầu: ")
				.append(safeText(toPlainText(assignment.getDescription())))
				.append("\n");
		builder.append("Loại bài tập: ").append(safeText(assignment.getAssignmentType())).append("\n");
	}

	private String safeText(String value) {
		if (!StringUtils.hasText(value)) {
			return "";
		}
		return limitText(value.trim(), LESSON_TEXT_LIMIT);
	}

	private String limitText(String value, int maxLength) {
		if (!StringUtils.hasText(value)) {
			return "";
		}
		String trimmed = value.trim();
		return trimmed.length() > maxLength ? trimmed.substring(0, maxLength) : trimmed;
	}
}
