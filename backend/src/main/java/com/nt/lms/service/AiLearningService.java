package com.nt.lms.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.json.JsonReadFeature;
import com.nt.lms.dto.request.AiLessonAssistantRequest;
import com.nt.lms.dto.response.AiLessonAssistantResponse;
import com.nt.lms.dto.response.AiQuizDraftResponse;
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

	@Value("${gemini.api-key:}")
	private String geminiApiKey;

	@Value("${gemini.base-url:https://generativelanguage.googleapis.com/v1beta}")
	private String geminiBaseUrl;

	@Value("${gemini.model:gemini-2.5-flash}")
	private String geminiModel;

	private static final int LESSON_CONTEXT_LIMIT = 6000;
	private static final int LESSON_TEXT_LIMIT = 1200;
	private static final int CHAT_HISTORY_LIMIT = 12;
	private static final int CHAT_HISTORY_CONTENT_LIMIT = 900;
	private static final int QUIZ_OUTPUT_TOKEN_LIMIT = 6000;
	private static final int ASSISTANT_OUTPUT_TOKEN_LIMIT = 2200;
	private static final long[] GEMINI_RETRY_DELAYS_MS = {800L, 1600L};

	@PostConstruct
	void logGeminiConfig() {
		log.info(
				"Gemini config loaded: baseUrl={}, model={}, apiKeyConfigured={}",
				StringUtils.hasText(geminiBaseUrl) ? geminiBaseUrl.trim() : "",
				getNormalizedModel(),
				StringUtils.hasText(geminiApiKey));
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

		JsonNode responseNode = callGeminiApi(
				buildGeminiRequest(
						"Bạn là trợ lý học tập thông minh cho hệ thống LMS. "
								+ "Chỉ được trả lời dựa trên nội dung bài học đã cung cấp. "
								+ "Nếu câu hỏi nằm ngoài bài học, hãy nói rõ rằng thông tin không có trong bài. "
								+ "Trả lời bằng tiếng Việt ngắn gọn, dễ hiểu, có cấu trúc. "
								+ "Tạo thêm 3 câu hỏi gợi ý để học tiếp.\n\n"
								+ "Người học hiện tại: " + user.getUsername() + ".\n"
								+ "Đây là ngữ cảnh bài học:\n" + lessonContext,
						input,
						schema,
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

	public AiQuizDraftResponse generateQuizDraftFromLesson(String lessonId, Object request, String username) {
		validateApiKey();
		Lesson lesson = getLessonOrThrow(lessonId);
		getUserOrThrow(username);

		int questionCount = 5;
		String difficulty = "MEDIUM";
		boolean includeExplanation = true;

		Map<String, Object> schema = createQuizDraftSchema();
		String lessonContext = buildLessonContext(lesson);
		String instruction = "Hãy sinh ra " + questionCount + " câu hỏi quiz từ nội dung bài học. "
				+ "Độ khó mong muốn: " + difficulty + ". "
				+ "Tất cả câu hỏi phải bám sát nội dung bài học, không được suy đoán ngoài phạm vi bài. "
				+ "Mỗi câu hỏi phải có ít nhất 2 đáp án. "
				+ "SINGLE_CHOICE và TRUE_FALSE phải có đúng 1 đáp án đúng. "
				+ "MULTIPLE_CHOICE phải có ít nhất 1 đáp án đúng. "
				+ (includeExplanation
						? "Bắt buộc viết explanation ngắn gọn, rõ ràng cho mỗi câu hỏi."
						: "Nếu không cần, explanation để chuỗi rỗng.");

		JsonNode responseNode = callGeminiApi(
				buildGeminiRequest(
						"Bạn là trợ lý tạo quiz cho hệ thống LMS. Đầu ra phải là JSON hợp lệ và bám sát bài học.\n\n"
								+ "Đây là ngữ cảnh bài học:\n" + lessonContext,
						List.of(message("user", instruction)),
						schema,
						QUIZ_OUTPUT_TOKEN_LIMIT));

		JsonNode payload = parseJsonPayload(extractOutputText(responseNode));
		return mapQuizDraftResponse(lesson, payload);
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
		JsonNode responseNode = callGeminiApi(
				buildGeminiRequest(
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

	public AiQuizDraftResponse generateStandaloneQuizDraft(String prompt, String systemContext) {
		validateApiKey();
		if (!StringUtils.hasText(prompt)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Yêu cầu tạo quiz không được để trống");
		}

		String instruction = "Tạo một bài quiz độc lập từ yêu cầu sau của người học: \"" + prompt.trim() + "\".\n"
				+ "Nếu người học không nêu số câu, tạo 5 câu. Nếu có số câu, giới hạn trong khoảng 3 đến 10 câu. "
				+ "Ưu tiên câu hỏi SINGLE_CHOICE, chỉ dùng MULTIPLE_CHOICE khi thật sự cần nhiều đáp án đúng. "
				+ "Mỗi câu SINGLE_CHOICE hoặc MULTIPLE_CHOICE có đúng 4 đáp án. "
				+ "Nội dung phải phù hợp để lưu thành bài quiz trong hệ thống LMS. "
				+ "Mỗi câu phải có explanation gồm 2 phần: giải thích đáp án đúng và một ví dụ ngắn minh họa thực tế. "
				+ "Explanation tối đa 500 ký tự, không viết quá dài để tránh JSON bị cắt.";

		JsonNode responseNode = callGeminiApi(
				buildGeminiRequest(
						"Bạn là trợ lý tạo quiz cho hệ thống LMS. "
								+ "Đầu ra phải là JSON hợp lệ theo schema. "
								+ "Không viết markdown, không giải thích ngoài JSON. "
								+ "Tạo quiz bằng tiếng Việt, đáp án rõ ràng, không nhập nhằng.\n\n"
								+ "Ngữ cảnh tổng quan nếu cần:\n" + (systemContext == null ? "" : systemContext),
						List.of(message("user", instruction)),
						createQuizDraftSchema(),
						QUIZ_OUTPUT_TOKEN_LIMIT));

		JsonNode payload = parseJsonPayload(extractOutputText(responseNode));
		return mapStandaloneQuizDraftResponse(payload);
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
		schema.put("type", "OBJECT");
		schema.put("properties", Map.of(
				"answer", Map.of("type", "STRING"),
				"suggestedQuestions", Map.of("type", "ARRAY", "items", Map.of("type", "STRING"))));
		schema.put("required", List.of("answer", "suggestedQuestions"));
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
			String role = "assistant".equalsIgnoreCase(item.getRole()) ? "model" : "user";
			input.add(message(role, limitText(item.getContent().trim(), CHAT_HISTORY_CONTENT_LIMIT)));
		}

		input.add(message("user", request.getMessage().trim()));
		return input;
	}

	private Map<String, Object> createQuizDraftSchema() {
		Map<String, Object> answerSchema = new LinkedHashMap<>();
		answerSchema.put("type", "OBJECT");
		answerSchema.put("properties", Map.of(
				"content", Map.of("type", "STRING"),
				"isCorrect", Map.of("type", "BOOLEAN")));
		answerSchema.put("required", List.of("content", "isCorrect"));

		Map<String, Object> questionSchema = new LinkedHashMap<>();
		questionSchema.put("type", "OBJECT");
		questionSchema.put("properties", Map.of(
				"content", Map.of("type", "STRING"),
				"explanation", Map.of("type", "STRING"),
				"questionType", Map.of("type", "STRING", "enum", List.of("SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE")),
				"points", Map.of("type", "INTEGER"),
				"orderIndex", Map.of("type", "INTEGER"),
				"answers", Map.of("type", "ARRAY", "items", answerSchema)));
		questionSchema.put("required", List.of("content", "explanation", "questionType", "points", "orderIndex", "answers"));

		Map<String, Object> schema = new LinkedHashMap<>();
		schema.put("type", "OBJECT");
		schema.put("properties", Map.of(
				"title", Map.of("type", "STRING"),
				"description", Map.of("type", "STRING"),
				"questions", Map.of("type", "ARRAY", "items", questionSchema)));
		schema.put("required", List.of("title", "description", "questions"));
		return schema;
	}

	private AiQuizDraftResponse mapQuizDraftResponse(Lesson lesson, JsonNode payload) {
		JsonNode questionsNode = payload.path("questions");
		if (!questionsNode.isArray() || questionsNode.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI không tạo được bộ câu hỏi hợp lệ");
		}

		List<AiQuizDraftResponse.QuestionDraft> questions = new ArrayList<>();
		int index = 0;
		for (JsonNode item : questionsNode) {
			List<AiQuizDraftResponse.AnswerDraft> answers = new ArrayList<>();
			JsonNode answersNode = item.path("answers");
			if (answersNode.isArray()) {
				for (JsonNode answerNode : answersNode) {
					answers.add(AiQuizDraftResponse.AnswerDraft.builder()
							.content(answerNode.path("content").asText(""))
							.isCorrect(answerNode.path("isCorrect").asBoolean(false))
							.build());
				}
			}

			questions.add(AiQuizDraftResponse.QuestionDraft.builder()
					.content(item.path("content").asText(""))
					.explanation(item.path("explanation").asText(""))
					.questionType(item.path("questionType").asText("SINGLE_CHOICE"))
					.points(item.path("points").asInt(1))
					.orderIndex(item.path("orderIndex").asInt(index))
					.answers(answers)
					.build());
			index++;
		}

		return AiQuizDraftResponse.builder()
				.title(payload.path("title").asText(lesson.getTitle() + " - Quiz"))
				.description(payload.path("description").asText("Quiz được sinh từ nội dung bài học"))
				.courseId(lesson.getSection() != null && lesson.getSection().getCourse() != null
						? lesson.getSection().getCourse().getId()
						: null)
				.lessonId(lesson.getId())
				.questions(questions)
				.model(getNormalizedModel())
				.build();
	}

	private AiQuizDraftResponse mapStandaloneQuizDraftResponse(JsonNode payload) {
		JsonNode questionsNode = payload.path("questions");
		if (!questionsNode.isArray() || questionsNode.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI không tạo được bộ câu hỏi hợp lệ");
		}

		List<AiQuizDraftResponse.QuestionDraft> questions = new ArrayList<>();
		int index = 0;
		for (JsonNode item : questionsNode) {
			List<AiQuizDraftResponse.AnswerDraft> answers = new ArrayList<>();
			JsonNode answersNode = item.path("answers");
			if (answersNode.isArray()) {
				for (JsonNode answerNode : answersNode) {
					answers.add(AiQuizDraftResponse.AnswerDraft.builder()
							.content(answerNode.path("content").asText(""))
							.isCorrect(answerNode.path("isCorrect").asBoolean(false))
							.build());
				}
			}

			questions.add(AiQuizDraftResponse.QuestionDraft.builder()
					.content(item.path("content").asText(""))
					.explanation(item.path("explanation").asText(""))
					.questionType(item.path("questionType").asText("SINGLE_CHOICE"))
					.points(item.path("points").asInt(1))
					.orderIndex(item.path("orderIndex").asInt(index))
					.answers(answers)
					.build());
			index++;
		}

		return AiQuizDraftResponse.builder()
				.title(payload.path("title").asText("Quiz ôn tập"))
				.description(payload.path("description").asText("Quiz được tạo tự động từ chatbot AI"))
				.questions(questions)
				.model(getNormalizedModel())
				.build();
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
		if (!StringUtils.hasText(geminiApiKey)) {
			throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Chưa cấu hình GEMINI_API_KEY");
		}
	}

	private String getNormalizedModel() {
		return StringUtils.hasText(geminiModel) ? geminiModel.trim() : "gemini-2.5-flash";
	}

	private JsonNode callGeminiApi(Map<String, Object> requestBody) {
		try {
			RestClient client = RestClient.builder()
					.baseUrl(geminiBaseUrl.trim())
					.defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
					.build();

			RestClientResponseException lastTransientException = null;
			for (int attempt = 0; attempt <= GEMINI_RETRY_DELAYS_MS.length; attempt++) {
				try {
					log.info("Calling Gemini API: model={}, baseUrl={}, attempt={}", getNormalizedModel(), geminiBaseUrl.trim(), attempt + 1);
					String rawBody = client.post()
							.uri(uriBuilder -> uriBuilder
									.path("/models/{model}:generateContent")
									.queryParam("key", geminiApiKey.trim())
									.build(getNormalizedModel()))
							.body(requestBody)
							.retrieve()
							.body(String.class);

					return objectMapper.readTree(rawBody);
				} catch (RestClientResponseException exception) {
					log.warn(
							"Gemini API returned error: model={}, status={}, body={}",
							getNormalizedModel(),
							exception.getStatusCode(),
							exception.getResponseBodyAsString());
					if (!isGeminiTemporarilyUnavailable(exception) || attempt >= GEMINI_RETRY_DELAYS_MS.length) {
						throw exception;
					}
					lastTransientException = exception;
					sleepBeforeRetry(GEMINI_RETRY_DELAYS_MS[attempt]);
				}
			}
			throw lastTransientException;
		} catch (RestClientResponseException exception) {
			throw mapGeminiError(exception);
		} catch (ResponseStatusException exception) {
			log.warn("Gemini API call aborted: model={}, reason={}", getNormalizedModel(), exception.getReason());
			throw exception;
		} catch (Exception exception) {
			log.warn("Gemini API call failed: model={}, message={}", getNormalizedModel(), exception.getMessage(), exception);
			throw new ResponseStatusException(
					HttpStatus.BAD_GATEWAY,
					"Không thể gọi Gemini API: " + exception.getMessage(),
					exception);
		}
	}

	private boolean isGeminiTemporarilyUnavailable(RestClientResponseException exception) {
		String responseBody = exception.getResponseBodyAsString();
		return exception.getStatusCode().value() == 503
				|| (responseBody != null && responseBody.contains("\"status\": \"UNAVAILABLE\""))
				|| (responseBody != null && responseBody.contains("high demand"));
	}

	private void sleepBeforeRetry(long delayMs) {
		try {
			Thread.sleep(delayMs);
		} catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Gemini API retry bị gián đoạn", exception);
		}
	}

	private String extractOutputText(JsonNode responseNode) {
		if (responseNode == null || responseNode.isMissingNode()) {
			return "";
		}
		JsonNode candidatesNode = responseNode.path("candidates");
		if (candidatesNode.isArray()) {
			StringBuilder builder = new StringBuilder();
			for (JsonNode item : candidatesNode) {
				JsonNode contentNode = item.path("content");
				JsonNode partsNode = contentNode.path("parts");
				if (!partsNode.isArray()) {
					continue;
				}
				for (JsonNode partItem : partsNode) {
					if (partItem.hasNonNull("text")) {
						builder.append(partItem.path("text").asText(""));
					}
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
			log.warn("Gemini returned non-JSON output: {}", toLogPreview(normalizedText));
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
				"parts", List.of(Map.of("text", content)));
	}

	private Map<String, Object> buildGeminiRequest(
			String systemInstruction,
			List<Map<String, Object>> contents,
			Map<String, Object> schema,
			int maxOutputTokens) {
		return Map.of(
				"system_instruction", Map.of("parts", List.of(Map.of("text", systemInstruction))),
				"contents", contents,
				"generationConfig", Map.of(
						"responseMimeType", "application/json",
						"responseSchema", schema,
						"maxOutputTokens", maxOutputTokens,
						"temperature", 0.3));
	}

	private ResponseStatusException mapGeminiError(RestClientResponseException exception) {
		String responseBody = exception.getResponseBodyAsString();
		if (exception.getStatusCode().value() == 404
				|| (responseBody != null && responseBody.contains("not found for API version"))) {
			return new ResponseStatusException(
					HttpStatus.BAD_GATEWAY,
					"Không tìm thấy model Gemini '" + getNormalizedModel()
							+ "' trên endpoint hiện tại. Hãy đổi GEMINI_MODEL sang model đang hỗ trợ generateContent, ví dụ gemini-2.5-flash.",
					exception);
		}
		if (exception.getStatusCode().value() == 429
				|| (responseBody != null && responseBody.contains("RESOURCE_EXHAUSTED"))
				|| (responseBody != null && responseBody.contains("generate_content_free_tier"))) {
			return new ResponseStatusException(
					HttpStatus.BAD_GATEWAY,
					"Gemini API đã hết quota hoặc đang bị giới hạn tốc độ. Vui lòng đợi ít phút, đổi model/API key, hoặc bật billing cho project.",
					exception);
		}
		if (exception.getStatusCode().value() == 503
				|| (responseBody != null && responseBody.contains("\"status\": \"UNAVAILABLE\""))
				|| (responseBody != null && responseBody.contains("high demand"))) {
			return new ResponseStatusException(
					HttpStatus.BAD_GATEWAY,
					"Gemini API đang quá tải tạm thời. Vui lòng thử lại sau ít phút hoặc đổi GEMINI_MODEL sang model khác đang rảnh hơn.",
					exception);
		}
		if (responseBody != null && responseBody.contains("insufficient_quota")) {
			return new ResponseStatusException(
					HttpStatus.BAD_GATEWAY,
					"Tài khoản Gemini API hiện không đủ quota hoặc billing chưa được bật",
					exception);
		}
		if (responseBody != null && responseBody.contains("API_KEY_INVALID")) {
			return new ResponseStatusException(
					HttpStatus.BAD_GATEWAY,
					"GEMINI_API_KEY không hợp lệ",
					exception);
		}
		if (responseBody != null && responseBody.contains("PERMISSION_DENIED")) {
			return new ResponseStatusException(
					HttpStatus.BAD_GATEWAY,
					"Gemini API từ chối truy cập. Kiểm tra API key và quyền của project",
					exception);
		}
		return new ResponseStatusException(
				HttpStatus.BAD_GATEWAY,
				"Không thể gọi Gemini API: " + exception.getStatusCode() + " " + responseBody,
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
		if (assignment.getMaxScore() != null) {
			builder.append("Điểm tối đa: ").append(assignment.getMaxScore()).append("\n");
		}
		if (assignment.getDueAt() != null) {
			builder.append("Hạn nộp: ").append(assignment.getDueAt()).append("\n");
		}
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
