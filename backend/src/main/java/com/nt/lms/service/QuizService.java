package com.nt.lms.service;

import java.util.List;

import com.nt.lms.dto.request.CreateQuizRequest;
import com.nt.lms.dto.request.SubmitQuizRequest;
import com.nt.lms.dto.response.AdminQuizAttemptResponse;
import com.nt.lms.dto.response.QuizResponse;
import com.nt.lms.dto.response.QuizResultResponse;
import com.nt.lms.entity.QuizOption;
import com.nt.lms.entity.Course;
import com.nt.lms.entity.Lesson;
import com.nt.lms.entity.Question;
import com.nt.lms.entity.Quiz;
import com.nt.lms.entity.QuizAttempt;
import com.nt.lms.entity.QuizResult;
import com.nt.lms.entity.User;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.repository.QuizOptionRepository;
import com.nt.lms.repository.CourseRepository;
import com.nt.lms.repository.QuestionRepository;
import com.nt.lms.repository.QuizAttemptRepository;
import com.nt.lms.repository.QuizRepository;
import com.nt.lms.repository.QuizResultRepository;
import com.nt.lms.repository.UserRepository;
import com.nt.lms.repository.LessonRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class QuizService {

    QuizRepository quizRepository;
    QuestionRepository questionRepository;
    QuizOptionRepository quizOptionRepository;
    QuizAttemptRepository quizAttemptRepository;
    QuizResultRepository quizResultRepository;
    UserRepository userRepository;
    CourseRepository courseRepository;
    LessonRepository lessonRepository;

    // ================= CREATE =================
    @Transactional
    public void createQuiz(CreateQuizRequest request) {
        validateQuizRequest(request);
        User currentUser = getCurrentUser();

        Course course = null;
        if (request.getCourseId() != null && !request.getCourseId().isBlank()) {
            course = courseRepository.findById(request.getCourseId())
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));
        }
        Lesson lesson = resolveLesson(request.getLessonId());

        Quiz quiz = Quiz.builder()
                .title(request.getTitle().trim())
                .description(trimToNull(request.getDescription()))
                .course(course)
                .lesson(lesson)
                .maxAttempts(resolveMaxAttempts(request.getMaxAttempts(), lesson != null))
                .timeLimitMinutes(resolveTimeLimitMinutes(request.getTimeLimitMinutes()))
                .isPublished(false)
                .quizScope(lesson != null ? "LESSON" : "INDEPENDENT")
                .createdSource("MANUAL")
                .createdBy(currentUser)
                .build();

        quiz = quizRepository.saveAndFlush(quiz);

        saveQuestions(quiz, request);
    }

    // ================= GET =================
    public QuizResponse getQuiz(String id) {
        Quiz quiz = quizRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.QUIZ_NOT_EXISTED));

        List<Question> questions = questionRepository.findByQuizId(id);

        return QuizResponse.builder()
                .id(quiz.getId())
                .title(quiz.getTitle())
                .description(quiz.getDescription())
                .courseId(quiz.getCourse() != null ? quiz.getCourse().getId() : null)
                .lessonId(quiz.getLesson() != null ? quiz.getLesson().getId() : null)
                .maxAttempts(quiz.getMaxAttempts())
                .timeLimitMinutes(quiz.getTimeLimitMinutes())
                .isPublished(quiz.getIsPublished())
                .questions(
                        questions.stream().map(q -> {
                            List<QuizOption> options =
                                    quizOptionRepository.findByQuestionIdOrderByOrderIndexAsc(q.getId());

                            return QuizResponse.Question.builder()
                                    .id(q.getId())
                                    .content(q.getContent())
                                    .explanation(q.getExplanation())
                                    .questionType(q.getQuestionType())
                                    .points(q.getPoints())
                                    .orderIndex(q.getOrderIndex())
                                    .options(
                                            options.stream().map(o ->
                                                    QuizResponse.Option.builder()
                                                            .id(o.getId())
                                                            .content(o.getOptionText())
                                                            .isCorrect(o.isCorrect())
                                                            .orderIndex(o.getOrderIndex())
                                                            .build()
                                            ).toList()
                                    )
                                    .build();
                        }).toList()
                )
                .build();
    }


    // ================= UPDATE =================
    @Transactional
    public void updateQuiz(String quizId, CreateQuizRequest request) {
        validateQuizRequest(request);

        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new AppException(ErrorCode.QUIZ_NOT_EXISTED));
        User currentUser = getCurrentUser();

        Course course = null;
        if (request.getCourseId() != null && !request.getCourseId().isBlank()) {
            course = courseRepository.findById(request.getCourseId())
                    .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));
        }
        Lesson lesson = resolveLesson(request.getLessonId());

        List<Question> oldQuestions = questionRepository.findByQuizId(quizId);

        for (Question question : oldQuestions) {
            quizOptionRepository.deleteByQuestionId(question.getId());
        }
        quizOptionRepository.flush();

        questionRepository.deleteAll(oldQuestions);
        questionRepository.flush();

        quiz.setTitle(request.getTitle().trim());
        quiz.setDescription(trimToNull(request.getDescription()));
        quiz.setCourse(course);
        quiz.setLesson(lesson);
        quiz.setMaxAttempts(resolveMaxAttempts(request.getMaxAttempts(), lesson != null));
        quiz.setTimeLimitMinutes(resolveTimeLimitMinutes(request.getTimeLimitMinutes()));
        quiz.setQuizScope(lesson != null ? "LESSON" : "INDEPENDENT");
        if (quiz.getCreatedSource() == null || quiz.getCreatedSource().isBlank()) {
            quiz.setCreatedSource("MANUAL");
        }
        if (quiz.getCreatedBy() == null) {
            quiz.setCreatedBy(currentUser);
        }

        quiz = quizRepository.saveAndFlush(quiz);

        saveQuestions(quiz, request);
    }

    // ================= DELETE =================
    @Transactional
    public void deleteQuiz(String quizId) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new AppException(ErrorCode.QUIZ_NOT_EXISTED));

        List<Question> questions = questionRepository.findByQuizId(quizId);

        for (Question question : questions) {
            quizOptionRepository.deleteByQuestionId(question.getId());
        }
        quizOptionRepository.flush();

        questionRepository.deleteAll(questions);
        questionRepository.flush();

        quizRepository.delete(quiz);
        quizRepository.flush();
    }

    // ================= SUBMIT =================
    public QuizResultResponse submitQuiz(SubmitQuizRequest request) {
        Quiz quiz = quizRepository.findById(request.getQuizId())
                .orElseThrow(() -> new AppException(ErrorCode.QUIZ_NOT_EXISTED));

        List<Question> questions = questionRepository.findByQuizId(quiz.getId());

        int correct = 0;

        for (Question q : questions) {
            String selectedOptionId = request.getAnswers().get(q.getId());

            if (selectedOptionId == null) continue;

            QuizOption option = quizOptionRepository.findById(selectedOptionId)
                    .orElse(null);

            // 🔥 FIX chuẩn
            if (option != null
                    && option.getQuestion().getId().equals(q.getId())
                    && option.isCorrect()) {
                correct++;
            }
        }

        double score = questions.isEmpty() ? 0 : (double) correct / questions.size() * 10;

        String username = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        QuizResult result = QuizResult.builder()
                .quiz(quiz)
                .user(user)
                .score(score)
                .build();

        quizResultRepository.save(result);

        return QuizResultResponse.builder()
                .quizId(quiz.getId())
                .score(score)
                .build();
    }



    // ================= VALIDATE =================
    private void validateQuizRequest(CreateQuizRequest request) {
        if (request == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (request.getTitle() == null || request.getTitle().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (request.getQuestions() == null || request.getQuestions().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (request.getMaxAttempts() != null && request.getMaxAttempts() < 1) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (request.getTimeLimitMinutes() != null && request.getTimeLimitMinutes() < 0) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        for (CreateQuizRequest.QuestionRequest question : request.getQuestions()) {
            if (question == null) {
                throw new AppException(ErrorCode.INVALID_REQUEST);
            }

            if (question.getContent() == null || question.getContent().trim().isEmpty()) {
                throw new AppException(ErrorCode.INVALID_REQUEST);
            }

            String questionType =
                    question.getQuestionType() == null || question.getQuestionType().trim().isEmpty()
                            ? "SINGLE_CHOICE"
                            : question.getQuestionType().trim();

            if (!"SINGLE_CHOICE".equals(questionType)
                    && !"MULTIPLE_CHOICE".equals(questionType)
                    && !"TRUE_FALSE".equals(questionType)) {
                throw new AppException(ErrorCode.INVALID_REQUEST);
            }

            if (question.getPoints() == null || question.getPoints() <= 0) {
                throw new AppException(ErrorCode.INVALID_REQUEST);
            }

            if (question.getAnswers() == null || question.getAnswers().size() < 2) {
                throw new AppException(ErrorCode.INVALID_REQUEST);
            }

            if ("TRUE_FALSE".equals(questionType) && question.getAnswers().size() != 2) {
                throw new AppException(ErrorCode.INVALID_REQUEST);
            }

            long correctCount = 0;

            for (CreateQuizRequest.AnswerRequest answer : question.getAnswers()) {
                if (answer == null) {
                    throw new AppException(ErrorCode.INVALID_REQUEST);
                }

                if (answer.getContent() == null || answer.getContent().trim().isEmpty()) {
                    throw new AppException(ErrorCode.INVALID_REQUEST);
                }

                if (answer.isCorrect()) {
                    correctCount++;
                }
            }

            if ("MULTIPLE_CHOICE".equals(questionType)) {
                if (correctCount < 1) {
                    throw new AppException(ErrorCode.INVALID_REQUEST);
                }
            } else {
                if (correctCount != 1) {
                    throw new AppException(ErrorCode.INVALID_REQUEST);
                }
            }
        }
    }

    private void saveQuestions(Quiz quiz, CreateQuizRequest request) {
        int questionIndex = 0;

        for (CreateQuizRequest.QuestionRequest q : request.getQuestions()) {
            String questionType =
                    q.getQuestionType() == null || q.getQuestionType().trim().isEmpty()
                            ? "SINGLE_CHOICE"
                            : q.getQuestionType().trim();

            Integer points = q.getPoints() == null || q.getPoints() <= 0 ? 1 : q.getPoints();
            Integer orderIndex = q.getOrderIndex() == null ? questionIndex : q.getOrderIndex();

            Question question = Question.builder()
                    .content(q.getContent().trim())
                    .explanation(trimToNull(q.getExplanation()))
                    .quiz(quiz)
                    .questionType(questionType)
                    .points(points)
                    .orderIndex(orderIndex)
                    .createdSource("SYSTEM")
                    .createdAt(java.time.LocalDateTime.now())
                    .build();

            question = questionRepository.saveAndFlush(question);

            int optionIndex = 0;

            for (CreateQuizRequest.AnswerRequest a : q.getAnswers()) {
                QuizOption option = QuizOption.builder()
                        .optionText(a.getContent().trim())
                        .isCorrect(a.isCorrect())
                        .orderIndex(optionIndex++)
                        .question(question)
                        .build();

                quizOptionRepository.save(option);
            }

            questionIndex++;
        }

        quizOptionRepository.flush();
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Lesson resolveLesson(String lessonId) {
        if (lessonId == null || lessonId.isBlank()) {
            return null;
        }

        return lessonRepository.findById(lessonId.trim())
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_EXISTED));
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    // ================= GET ALL =================
    public List<QuizResponse> getAllQuizzes() {
        return quizRepository.findAllByOrderByIdDesc().stream()
                .map(q -> {
                    long attemptCount = quizAttemptRepository.countByQuizId(q.getId());

                    return QuizResponse.builder()
                            .id(q.getId())
                            .title(q.getTitle())
                            .description(q.getDescription())
                            .courseId(q.getCourse() != null ? q.getCourse().getId() : null)
                            .lessonId(q.getLesson() != null ? q.getLesson().getId() : null)
                            .maxAttempts(q.getMaxAttempts())
                            .timeLimitMinutes(q.getTimeLimitMinutes())
                            .isPublished(q.getIsPublished())
                            .attemptCount(attemptCount)
                            .questions(null)
                            .build();
                })
                .toList();
    }

    public List<AdminQuizAttemptResponse> getQuizAttempts(String quizId) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new AppException(ErrorCode.QUIZ_NOT_EXISTED));

        return quizAttemptRepository.findByQuizIdOrderBySubmittedAtDescStartedAtDesc(quizId)
                .stream()
                .map(attempt -> buildAdminAttemptResponse(quiz, attempt))
                .toList();
    }

    @Transactional
    public void updateQuizPublishStatus(String quizId, boolean published) {
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new AppException(ErrorCode.QUIZ_NOT_EXISTED));

        User currentUser = getCurrentUser();
        boolean isAdmin = currentUser.getRoles() != null
                && currentUser.getRoles().stream().anyMatch(role -> "ADMIN".equalsIgnoreCase(role.getName()));
        boolean isInstructor = currentUser.getRoles() != null
                && currentUser.getRoles().stream().anyMatch(role -> "INSTRUCTOR".equalsIgnoreCase(role.getName()));
        boolean isOwner = quiz.getCreatedBy() != null
                && quiz.getCreatedBy().getId().equals(currentUser.getId());
        boolean independentQuiz = quiz.getCourse() == null && quiz.getLesson() == null;

        if (quiz.getCreatedBy() == null && independentQuiz && (isAdmin || isInstructor)) {
            quiz.setCreatedBy(currentUser);
            isOwner = true;
        }

        if (!isAdmin && !isOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ban khong co quyen cap nhat trang thai quiz nay");
        }

        quiz.setIsPublished(published);
        quizRepository.save(quiz);
    }

    private Integer resolveMaxAttempts(Integer requestedMaxAttempts, boolean lessonLinked) {
        if (lessonLinked) {
            return 1;
        }

        if (requestedMaxAttempts == null || requestedMaxAttempts < 1) {
            return 1;
        }

        return requestedMaxAttempts;
    }

    private Integer resolveTimeLimitMinutes(Integer requestedTimeLimitMinutes) {
        if (requestedTimeLimitMinutes == null || requestedTimeLimitMinutes <= 0) {
            return null;
        }

        return requestedTimeLimitMinutes;
    }

    private AdminQuizAttemptResponse buildAdminAttemptResponse(Quiz quiz, QuizAttempt attempt) {
        User user = attempt.getUser();
        double totalScore = safeDouble(attempt.getTotalScore());
        double score = safeDouble(attempt.getScore());

        return AdminQuizAttemptResponse.builder()
                .attemptId(attempt.getId())
                .quizId(quiz.getId())
                .quizTitle(quiz.getTitle())
                .userId(user != null ? user.getId() : null)
                .username(user != null ? user.getUsername() : null)
                .fullName(user != null ? user.getFullName() : null)
                .email(user != null ? user.getEmail() : null)
                .attemptNo(attempt.getAttemptNo())
                .status(attempt.getStatus() != null ? attempt.getStatus().name() : null)
                .score(score)
                .totalScore(totalScore)
                .scorePercent(totalScore <= 0 ? 0.0 : roundTwoDecimals((score * 100.0) / totalScore))
                .startedAt(attempt.getStartedAt())
                .submittedAt(attempt.getSubmittedAt())
                .build();
    }

    private double safeDouble(Number value) {
        return value == null ? 0.0 : value.doubleValue();
    }

    private double roundTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
