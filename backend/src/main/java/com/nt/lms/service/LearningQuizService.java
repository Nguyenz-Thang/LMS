package com.nt.lms.service;

import com.nt.lms.dto.request.QuizAnswerRequest;
import com.nt.lms.dto.response.LearningQuizOptionResponse;
import com.nt.lms.dto.response.LearningQuizQuestionResponse;
import com.nt.lms.dto.response.LearningQuizResponse;
import com.nt.lms.dto.response.StandaloneQuizAttemptResponse;
import com.nt.lms.dto.response.StandaloneQuizListItemResponse;
import com.nt.lms.entity.Enrollment;
import com.nt.lms.entity.Lesson;
import com.nt.lms.entity.LessonProgress;
import com.nt.lms.entity.Question;
import com.nt.lms.entity.Quiz;
import com.nt.lms.entity.QuizAttempt;
import com.nt.lms.entity.QuizAttemptAnswer;
import com.nt.lms.entity.QuizAttemptStatus;
import com.nt.lms.entity.QuizOption;
import com.nt.lms.entity.User;
import com.nt.lms.enums.EnrollmentStatus;
import com.nt.lms.repository.EnrollmentRepository;
import com.nt.lms.repository.LessonProgressRepository;
import com.nt.lms.repository.LessonRepository;
import com.nt.lms.repository.QuestionRepository;
import com.nt.lms.repository.QuizAttemptAnswerRepository;
import com.nt.lms.repository.QuizAttemptRepository;
import com.nt.lms.repository.QuizOptionRepository;
import com.nt.lms.repository.QuizRepository;
import com.nt.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LearningQuizService {

    private static final String MULTIPLE_CHOICE = "MULTIPLE_CHOICE";
    private static final String ANSWER_IDS_PREFIX = "OPTION_IDS:";

    private final UserRepository userRepository;
    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final QuizOptionRepository quizOptionRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final QuizAttemptAnswerRepository quizAttemptAnswerRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final LessonRepository lessonRepository;

    public List<StandaloneQuizListItemResponse> getIndependentQuizzes() {
        User currentUser = getCurrentUser();
        List<Quiz> quizzes = canManageUnpublishedIndependentQuizzes(currentUser)
                ? quizRepository.findByCourseIsNullAndLessonIsNullOrderByIdDesc()
                : quizRepository.findByCourseIsNullAndLessonIsNullAndIsPublishedTrueOrderByIdDesc();

        return quizzes.stream()
                .filter(quiz -> canAccessIndependentQuiz(currentUser, quiz))
                .map(quiz -> {
                    List<Question> questions = questionRepository.findByQuizIdOrderByOrderIndexAsc(quiz.getId());
                    List<QuizAttempt> attempts = quizAttemptRepository
                            .findByQuizIdAndUserIdOrderByAttemptNoDesc(quiz.getId(), currentUser.getId());

                    QuizAttempt latestAttempt = attempts.isEmpty() ? null : attempts.get(0);
                    double bestScorePercent = attempts.stream()
                            .mapToDouble(this::calculateScorePercent)
                            .max()
                            .orElse(0.0);
                    double bestScore = attempts.stream()
                            .mapToDouble(this::safeScore)
                            .max()
                            .orElse(0.0);

                    return StandaloneQuizListItemResponse.builder()
                            .quizId(quiz.getId())
                            .title(quiz.getTitle())
                            .description(quiz.getDescription())
                            .questionCount(questions.size())
                            .maxAttempts(null)
                            .timeLimitMinutes(quiz.getTimeLimitMinutes())
                            .published(Boolean.TRUE.equals(quiz.getIsPublished()))
                            .attemptCount(attempts.size())
                            .bestScore(bestScore)
                            .bestScorePercent(roundTo2Decimals(bestScorePercent))
                            .latestAttemptId(latestAttempt != null ? latestAttempt.getId() : null)
                            .latestAttemptStatus(latestAttempt != null && latestAttempt.getStatus() != null
                                    ? latestAttempt.getStatus().name()
                                    : null)
                            .latestStartedAt(latestAttempt != null ? latestAttempt.getStartedAt() : null)
                            .latestSubmittedAt(latestAttempt != null ? latestAttempt.getSubmittedAt() : null)
                            .build();
                })
                .toList();
    }

    public LearningQuizResponse getQuizDetail(String quizId) {
        User currentUser = getCurrentUser();
        Quiz quiz = getQuizOrThrow(quizId);

        validateQuizAccess(currentUser, quiz);

        QuizAttempt latestAttempt = quizAttemptRepository
                .findTopByQuizIdAndUserIdOrderByAttemptNoDesc(quizId, currentUser.getId())
                .orElse(null);

        return buildQuizResponse(quiz, latestAttempt);
    }

    public List<StandaloneQuizAttemptResponse> getIndependentQuizAttempts() {
        User currentUser = getCurrentUser();

        return quizAttemptRepository
                .findByUserIdAndQuizCourseIsNullAndQuizLessonIsNullOrderBySubmittedAtDescStartedAtDesc(currentUser.getId())
                .stream()
                .filter(attempt -> canAccessIndependentQuiz(currentUser, attempt.getQuiz()))
                .map(this::buildAttemptSummary)
                .toList();
    }

    public LearningQuizResponse getAttemptReview(String attemptId) {
        User currentUser = getCurrentUser();

        QuizAttempt attempt = quizAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lượt làm quiz"));

        if (!attempt.getUser().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xem kết quả này");
        }

        validateQuizAccess(currentUser, attempt.getQuiz());
        return buildQuizResponse(attempt.getQuiz(), attempt);
    }

    public LearningQuizResponse startQuiz(String quizId) {
        User currentUser = getCurrentUser();
        Quiz quiz = getQuizOrThrow(quizId);

        validateQuizAccess(currentUser, quiz);

        QuizAttempt latestAttempt = quizAttemptRepository
                .findTopByQuizIdAndUserIdOrderByAttemptNoDesc(quizId, currentUser.getId())
                .orElse(null);

        if (latestAttempt != null && latestAttempt.getStatus() == QuizAttemptStatus.IN_PROGRESS) {
            return buildQuizResponse(quiz, latestAttempt);
        }

        int nextAttemptNo = latestAttempt == null ? 1 : (safeInt(latestAttempt.getAttemptNo()) + 1);

        QuizAttempt attempt = QuizAttempt.builder()
                .quiz(quiz)
                .user(currentUser)
                .attemptNo(nextAttemptNo)
                .score(0.0)
                .totalScore(calculateTotalScore(quizId))
                .startedAt(LocalDateTime.now())
                .status(QuizAttemptStatus.IN_PROGRESS)
                .build();

        QuizAttempt saved = quizAttemptRepository.save(attempt);
        return buildQuizResponse(quiz, saved);
    }

    public LearningQuizResponse saveAnswer(String attemptId, QuizAnswerRequest request) {
        User currentUser = getCurrentUser();

        QuizAttempt attempt = quizAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lượt làm quiz"));

        if (!attempt.getUser().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền cập nhật lượt làm này");
        }

        if (attempt.getStatus() != QuizAttemptStatus.IN_PROGRESS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quiz này đã nộp, không thể sửa đáp án");
        }

        Question question = questionRepository.findById(request.getQuestionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy câu hỏi"));

        if (!question.getQuiz().getId().equals(attempt.getQuiz().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Câu hỏi không thuộc quiz này");
        }

        QuizAttemptAnswer answer = quizAttemptAnswerRepository
                .findByAttemptIdAndQuestionId(attemptId, question.getId())
                .orElseGet(() -> QuizAttemptAnswer.builder()
                        .attempt(attempt)
                        .question(question)
                        .build());

        if (isMultipleChoice(question)) {
            saveMultipleChoiceAnswer(question, request, answer);
        } else {
            saveSingleChoiceAnswer(question, request, answer);
        }

        quizAttemptAnswerRepository.save(answer);
        return buildQuizResponse(attempt.getQuiz(), attempt);
    }

    public LearningQuizResponse submitQuiz(String attemptId) {
        User currentUser = getCurrentUser();

        QuizAttempt attempt = quizAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lượt làm quiz"));

        if (!attempt.getUser().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền nộp lượt làm này");
        }

        List<Question> questions = questionRepository.findByQuizIdOrderByOrderIndexAsc(attempt.getQuiz().getId());
        List<QuizAttemptAnswer> answers = quizAttemptAnswerRepository.findByAttemptId(attemptId);

        Map<String, QuizAttemptAnswer> answerMap = answers.stream()
                .collect(Collectors.toMap(a -> a.getQuestion().getId(), a -> a, (a, b) -> a));

        double totalScore = questions.size();
        double earnedScore = 0.0;
        boolean allAnswered = !questions.isEmpty();

        for (Question question : questions) {
            QuizAttemptAnswer answer = answerMap.get(question.getId());
            if (!hasAnsweredQuestion(question, answer)) {
                allAnswered = false;
                continue;
            }

            if (Boolean.TRUE.equals(answer.getIsCorrect())) {
                earnedScore += 1.0;
            }
        }

        attempt.setTotalScore(totalScore);
        attempt.setScore(earnedScore);
        attempt.setSubmittedAt(LocalDateTime.now());
        attempt.setStatus(QuizAttemptStatus.SUBMITTED);
        quizAttemptRepository.save(attempt);

        boolean passed = allAnswered && earnedScore >= resolvePassingScore(attempt.getQuiz(), questions.size());
        Lesson lesson = resolveQuizLesson(attempt.getQuiz());
        if (passed && lesson != null) {
            markLessonCompleted(currentUser, lesson);
        }

        return buildQuizResponse(attempt.getQuiz(), attempt);
    }

    private Lesson resolveQuizLesson(Quiz quiz) {
        if (quiz == null) {
            return null;
        }

        if (quiz.getLesson() != null) {
            return quiz.getLesson();
        }

        return null;
    }

    private void saveSingleChoiceAnswer(Question question, QuizAnswerRequest request, QuizAttemptAnswer answer) {
        QuizOption selectedOption = null;
        if (request.getSelectedOptionId() != null && !request.getSelectedOptionId().isBlank()) {
            selectedOption = quizOptionRepository.findById(request.getSelectedOptionId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đáp án"));

            if (!selectedOption.getQuestion().getId().equals(question.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đáp án không thuộc câu hỏi này");
            }
        }

        answer.setSelectedOption(selectedOption);
        answer.setAnswerText(request.getAnswerText());

        if (selectedOption != null) {
            boolean isCorrect = selectedOption.isCorrect();
            answer.setIsCorrect(isCorrect);
            answer.setEarnedPoints(isCorrect ? 1.0 : 0.0);
        } else {
            answer.setIsCorrect(false);
            answer.setEarnedPoints(0.0);
        }
    }

    private void saveMultipleChoiceAnswer(Question question, QuizAnswerRequest request, QuizAttemptAnswer answer) {
        List<String> selectedOptionIds = normalizeSelectedOptionIds(request.getSelectedOptionIds());
        List<QuizOption> selectedOptions = selectedOptionIds.stream()
                .map(optionId -> quizOptionRepository.findById(optionId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đáp án")))
                .toList();

        boolean belongsToQuestion = selectedOptions.stream()
                .allMatch(option -> option.getQuestion().getId().equals(question.getId()));
        if (!belongsToQuestion) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đáp án không thuộc câu hỏi này");
        }

        List<String> correctIds = quizOptionRepository.findByQuestionIdOrderByOrderIndexAsc(question.getId())
                .stream()
                .filter(QuizOption::isCorrect)
                .map(QuizOption::getId)
                .sorted()
                .toList();

        List<String> normalizedSelected = selectedOptionIds.stream().sorted().toList();
        boolean isCorrect = !normalizedSelected.isEmpty() && normalizedSelected.equals(correctIds);

        answer.setSelectedOption(null);
        answer.setAnswerText(serializeSelectedOptionIds(selectedOptionIds));
        answer.setIsCorrect(isCorrect);
        answer.setEarnedPoints(isCorrect ? 1.0 : 0.0);
    }

    private void markLessonCompleted(User currentUser, Lesson lesson) {
        LessonProgress progress = lessonProgressRepository.findByUserIdAndLessonId(currentUser.getId(), lesson.getId())
                .orElseGet(() -> LessonProgress.builder()
                        .user(currentUser)
                        .lesson(lesson)
                        .completed(false)
                        .watchedSeconds(0)
                        .lastPositionSec(0)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build());

        progress.setCompleted(true);
        if (progress.getCompletedAt() == null) {
            progress.setCompletedAt(LocalDateTime.now());
        }
        progress.setLastAccessedAt(LocalDateTime.now());
        progress.setUpdatedAt(LocalDateTime.now());
        lessonProgressRepository.save(progress);

        if (lesson.getSection() != null && lesson.getSection().getCourse() != null) {
            enrollmentRepository.findByUserIdAndCourseId(currentUser.getId(), lesson.getSection().getCourse().getId())
                    .ifPresent(enrollment -> {
                        long totalLessons = lessonRepository.countBySection_Course_Id(
                                lesson.getSection().getCourse().getId());
                        if (totalLessons <= 0) {
                            enrollment.setProgressPercent(0.0);
                        } else {
                            long completedLessons = lessonProgressRepository
                                    .countByUserIdAndLesson_Section_Course_IdAndCompletedTrue(
                                            currentUser.getId(),
                                            lesson.getSection().getCourse().getId());
                            double percent = (completedLessons * 100.0) / totalLessons;
                            enrollment.setProgressPercent(Math.round(percent * 100.0) / 100.0);
                        }
                        enrollment.setLastAccessedAt(LocalDateTime.now());
                        enrollmentRepository.save(enrollment);
                    });
        }
    }

    private LearningQuizResponse buildQuizResponse(Quiz quiz, QuizAttempt attempt) {
        List<Question> questions = questionRepository.findByQuizIdOrderByOrderIndexAsc(quiz.getId());
        List<QuizAttemptAnswer> answers = attempt == null
                ? Collections.emptyList()
                : quizAttemptAnswerRepository.findByAttemptId(attempt.getId());

        Map<String, QuizAttemptAnswer> answerMap = answers.stream()
                .collect(Collectors.toMap(a -> a.getQuestion().getId(), a -> a, (a, b) -> a));

        int passingScore = resolvePassingScore(quiz, questions.size());
        boolean passed = false;
        if (attempt != null && attempt.getStatus() != QuizAttemptStatus.IN_PROGRESS) {
            boolean allAnswered = !questions.isEmpty()
                    && questions.stream().allMatch(question -> hasAnsweredQuestion(question, answerMap.get(question.getId())));
            passed = allAnswered && safeScore(attempt) >= passingScore;
        }

        List<LearningQuizQuestionResponse> questionResponses = new ArrayList<>();

        for (Question question : questions) {
            List<QuizOption> options = quizOptionRepository
                    .findByQuestionIdOrderByOrderIndexAsc(question.getId());

            List<LearningQuizOptionResponse> optionResponses = options.stream()
                    .map(option -> LearningQuizOptionResponse.builder()
                            .id(option.getId())
                            .optionText(option.getOptionText())
                            .orderIndex(safeInt(option.getOrderIndex()))
                            .build())
                    .toList();

            QuizAttemptAnswer answer = answerMap.get(question.getId());
            List<QuizOption> correctOptions = options.stream()
                    .filter(QuizOption::isCorrect)
                    .toList();
            QuizOption firstCorrectOption = correctOptions.isEmpty() ? null : correctOptions.get(0);

            questionResponses.add(LearningQuizQuestionResponse.builder()
                    .id(question.getId())
                    .questionText(question.getContent())
                    .questionType(question.getQuestionType())
                    .explanation(passed ? question.getExplanation() : null)
                    .orderIndex(safeInt(question.getOrderIndex()))
                    .selectedOptionId(
                            answer != null && answer.getSelectedOption() != null
                                    ? answer.getSelectedOption().getId()
                                    : null
                    )
                    .selectedOptionIds(extractSelectedOptionIds(answer))
                    .correctOptionId(passed && firstCorrectOption != null ? firstCorrectOption.getId() : null)
                    .correctOptionText(passed && firstCorrectOption != null ? firstCorrectOption.getOptionText() : null)
                    .correctOptionIds(passed ? correctOptions.stream().map(QuizOption::getId).toList() : List.of())
                    .correctOptionTexts(passed ? correctOptions.stream().map(QuizOption::getOptionText).toList() : List.of())
                    .correct(passed && answer != null ? answer.getIsCorrect() : null)
                    .options(optionResponses)
                    .build());
        }

        return LearningQuizResponse.builder()
                .quizId(quiz.getId())
                .title(quiz.getTitle())
                .description(quiz.getDescription())
                .quizScope(quiz.getQuizScope() != null ? String.valueOf(quiz.getQuizScope()) : null)
                .timeLimitMinutes(quiz.getTimeLimitMinutes())
                .maxAttempts(null)
                .passingScore(passingScore)
                .attemptId(attempt != null ? attempt.getId() : null)
                .attemptNo(attempt != null ? attempt.getAttemptNo() : null)
                .attemptStatus(attempt != null && attempt.getStatus() != null ? attempt.getStatus().name() : null)
                .score(attempt != null ? safeScore(attempt) : 0.0)
                .totalScore(attempt != null ? safeTotalScore(attempt) : calculateTotalScore(quiz.getId()))
                .passed(passed)
                .startedAt(attempt != null ? attempt.getStartedAt() : null)
                .submittedAt(attempt != null ? attempt.getSubmittedAt() : null)
                .questions(questionResponses)
                .build();
    }

    private void validateQuizAccess(User currentUser, Quiz quiz) {
        if (isIndependentQuiz(quiz)) {
            if (!canAccessIndependentQuiz(currentUser, quiz)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bài luyện tập này chưa được publish");
            }
            return;
        }

        String courseId = null;

        if (quiz.getCourse() != null) {
            courseId = quiz.getCourse().getId();
        } else if (quiz.getLesson() != null
                && quiz.getLesson().getSection() != null
                && quiz.getLesson().getSection().getCourse() != null) {
            courseId = quiz.getLesson().getSection().getCourse().getId();
        }

        if (courseId != null) {
            Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(currentUser.getId(), courseId)
                    .orElse(null);

            if (enrollment == null || enrollment.getStatus() != EnrollmentStatus.ACTIVE) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ban chua dang ky khoa hoc de lam quiz nay");
            }
        }
    }

    private StandaloneQuizAttemptResponse buildAttemptSummary(QuizAttempt attempt) {
        List<Question> questions = questionRepository.findByQuizIdOrderByOrderIndexAsc(attempt.getQuiz().getId());

        return StandaloneQuizAttemptResponse.builder()
                .attemptId(attempt.getId())
                .quizId(attempt.getQuiz().getId())
                .quizTitle(attempt.getQuiz().getTitle())
                .quizDescription(attempt.getQuiz().getDescription())
                .attemptNo(attempt.getAttemptNo())
                .attemptStatus(attempt.getStatus() != null ? attempt.getStatus().name() : null)
                .questionCount(questions.size())
                .score(safeScore(attempt))
                .totalScore(safeTotalScore(attempt))
                .scorePercent(roundTo2Decimals(calculateScorePercent(attempt)))
                .passed(isAttemptPassed(attempt))
                .startedAt(attempt.getStartedAt())
                .submittedAt(attempt.getSubmittedAt())
                .build();
    }

    private boolean isIndependentQuiz(Quiz quiz) {
        return quiz.getCourse() == null && quiz.getLesson() == null;
    }

    private boolean canManageUnpublishedIndependentQuizzes(User user) {
        return hasRole(user, "ADMIN") || hasRole(user, "INSTRUCTOR");
    }

    private boolean canAccessIndependentQuiz(User user, Quiz quiz) {
        if (!isIndependentQuiz(quiz)) {
            return false;
        }

        if (Boolean.TRUE.equals(quiz.getIsPublished())) {
            return true;
        }

        if (hasRole(user, "ADMIN")) {
            return true;
        }

        return hasRole(user, "INSTRUCTOR")
                && quiz.getCreatedBy() != null
                && Objects.equals(quiz.getCreatedBy().getId(), user.getId());
    }

    private boolean hasRole(User user, String roleName) {
        return user.getRoles() != null
                && user.getRoles().stream().anyMatch(role -> roleName.equalsIgnoreCase(role.getName()));
    }

    private boolean isAttemptPassed(QuizAttempt attempt) {
        if (attempt == null || attempt.getStatus() == QuizAttemptStatus.IN_PROGRESS) {
            return false;
        }

        if (safeTotalScore(attempt) <= 0) {
            return false;
        }

        return safeScore(attempt) >= resolvePassingScore(attempt.getQuiz(), (int) Math.round(safeTotalScore(attempt)));
    }

    private double calculateScorePercent(QuizAttempt attempt) {
        double totalScore = safeTotalScore(attempt);
        if (totalScore <= 0) {
            return 0.0;
        }

        return (safeScore(attempt) * 100.0) / totalScore;
    }

    private Quiz getQuizOrThrow(String quizId) {
        return quizRepository.findById(quizId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy quiz"));
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Không xác định được người dùng"));
    }

    private boolean isMultipleChoice(Question question) {
        return MULTIPLE_CHOICE.equalsIgnoreCase(question.getQuestionType());
    }

    private boolean hasAnsweredQuestion(Question question, QuizAttemptAnswer answer) {
        if (answer == null) {
            return false;
        }

        if (isMultipleChoice(question)) {
            return !extractSelectedOptionIds(answer).isEmpty();
        }

        return answer.getSelectedOption() != null;
    }

    private List<String> normalizeSelectedOptionIds(List<String> optionIds) {
        if (optionIds == null) {
            return List.of();
        }

        return optionIds.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .distinct()
                .toList();
    }

    private String serializeSelectedOptionIds(List<String> optionIds) {
        List<String> normalized = normalizeSelectedOptionIds(optionIds);
        if (normalized.isEmpty()) {
            return null;
        }

        return ANSWER_IDS_PREFIX + String.join(",", normalized);
    }

    private List<String> extractSelectedOptionIds(QuizAttemptAnswer answer) {
        if (answer == null) {
            return List.of();
        }

        if (answer.getSelectedOption() != null) {
            return List.of(answer.getSelectedOption().getId());
        }

        String answerText = answer.getAnswerText();
        if (answerText == null || !answerText.startsWith(ANSWER_IDS_PREFIX)) {
            return List.of();
        }

        String rawIds = answerText.substring(ANSWER_IDS_PREFIX.length());
        if (rawIds.isBlank()) {
            return List.of();
        }

        return Arrays.stream(rawIds.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .distinct()
                .toList();
    }

    private double calculateTotalScore(String quizId) {
        return questionRepository.findByQuizIdOrderByOrderIndexAsc(quizId)
                .stream()
                .mapToDouble(q -> 1.0)
                .sum();
    }

    private int resolvePassingScore(Quiz quiz, int questionCount) {
        int safeQuestionCount = Math.max(0, questionCount);
        Integer requestedPassingScore = quiz != null ? quiz.getPassingScore() : null;

        if (requestedPassingScore == null || requestedPassingScore <= 0) {
            return safeQuestionCount;
        }

        return Math.min(requestedPassingScore, safeQuestionCount);
    }

    private double safeDouble(Number value) {
        return value == null ? 0.0 : value.doubleValue();
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private double safeScore(QuizAttempt attempt) {
        return attempt == null ? 0.0 : safeDouble(attempt.getScore());
    }

    private double safeTotalScore(QuizAttempt attempt) {
        return attempt == null ? 0.0 : safeDouble(attempt.getTotalScore());
    }

    private double roundTo2Decimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
