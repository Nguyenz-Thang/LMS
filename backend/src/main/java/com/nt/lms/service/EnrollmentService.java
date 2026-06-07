package com.nt.lms.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.nt.lms.dto.request.EnrollmentRequest;
import com.nt.lms.dto.response.EnrollmentResponse;
import com.nt.lms.dto.response.ProgressDashboardResponse;
import com.nt.lms.dto.response.ProgressPausedLessonResponse;
import com.nt.lms.dto.response.ProgressQuizInsightResponse;
import com.nt.lms.dto.response.ProgressRiskCourseResponse;
import com.nt.lms.dto.response.ProgressSummaryResponse;
import com.nt.lms.dto.response.ProgressTimelinePointResponse;
import com.nt.lms.entity.Course;
import com.nt.lms.entity.Enrollment;
import com.nt.lms.entity.Lesson;
import com.nt.lms.entity.LessonProgress;
import com.nt.lms.entity.Quiz;
import com.nt.lms.entity.QuizAttempt;
import com.nt.lms.entity.User;
import com.nt.lms.enums.EnrollmentStatus;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.mapper.EnrollmentMapper;
import com.nt.lms.repository.CourseRepository;
import com.nt.lms.repository.EnrollmentRepository;
import com.nt.lms.repository.LessonProgressRepository;
import com.nt.lms.repository.LessonRepository;
import com.nt.lms.repository.QuizAttemptRepository;
import com.nt.lms.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class EnrollmentService {

    EnrollmentRepository enrollmentRepository;
    CourseRepository courseRepository;
    UserRepository userRepository;
    EnrollmentMapper enrollmentMapper;
    LessonProgressRepository lessonProgressRepository;
    LessonRepository lessonRepository;
    QuizAttemptRepository quizAttemptRepository;
    AppNotificationService appNotificationService;

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getAllEnrollments() {
        return enrollmentRepository.findAll()
                .stream()
                .map(enrollmentMapper::toEnrollmentResponse)
                .toList();
    }

    @Transactional
    public EnrollmentResponse enroll(EnrollmentRequest request) {
        if (request == null || request.getCourseId() == null || request.getCourseId().isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = resolveEnrollmentUser(request, authentication);

        Course course = courseRepository.findById(request.getCourseId().trim())
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));

        if (enrollmentRepository.existsByUserIdAndCourseId(user.getId(), course.getId())) {
            throw new AppException(ErrorCode.ALREADY_ENROLLED);
        }

        if (requiresPayment(course) && !Boolean.TRUE.equals(request.getPaymentConfirmed())) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        Enrollment enrollment = Enrollment.builder()
                .user(user)
                .course(course)
                .status(EnrollmentStatus.ACTIVE)
                .progressPercent(0.0)
                .enrolledAt(LocalDateTime.now())
                .lastAccessedAt(null)
                .build();

        enrollment = enrollmentRepository.save(enrollment);
        appNotificationService.notifyCourseEnrollment(enrollment, Boolean.TRUE.equals(request.getPaymentConfirmed()));
        return enrollmentMapper.toEnrollmentResponse(enrollment);
    }

    private User resolveEnrollmentUser(EnrollmentRequest request, Authentication authentication) {
        if (request.getUserId() != null && !request.getUserId().isBlank()) {
            boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                    .anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority())
                            || "ADMIN".equals(authority.getAuthority()));

            if (!isAdmin) {
                throw new AppException(ErrorCode.UNAUTHORIZED);
            }

            return userRepository.findById(request.getUserId().trim())
                    .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        }

        String username = authentication != null ? authentication.getName() : null;
        if (username == null || username.isBlank()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getMyCourses() {
        String username = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        return enrollmentRepository.findByUserId(user.getId())
                .stream()
                .map(enrollmentMapper::toEnrollmentResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProgressDashboardResponse getMyDashboard(Integer year) {
        User user = getCurrentUser();
        LocalDate today = LocalDate.now();

        List<Enrollment> enrollments = enrollmentRepository.findByUserId(user.getId());
        List<LessonProgress> progresses = lessonProgressRepository.findByUserId(user.getId());
        List<QuizAttempt> attempts = quizAttemptRepository.findByUserIdOrderByStartedAtDesc(user.getId());

        Map<String, Integer> totalLessonsByCourse = new LinkedHashMap<>();
        Map<String, Integer> completedLessonsByCourse = new LinkedHashMap<>();

        for (Enrollment enrollment : enrollments) {
            String courseId = enrollment.getCourse() != null ? enrollment.getCourse().getId() : null;
            if (courseId == null) {
                continue;
            }

            int totalLessons = (int) lessonRepository.countBySection_Course_Id(courseId);

            int completedLessons = (int) progresses.stream()
                    .filter(progress -> progress.getLesson() != null
                            && progress.getLesson().getSection() != null
                            && progress.getLesson().getSection().getCourse() != null
                            && courseId.equals(progress.getLesson().getSection().getCourse().getId())
                            && Boolean.TRUE.equals(progress.getCompleted()))
                    .count();

            totalLessonsByCourse.put(courseId, totalLessons);
            completedLessonsByCourse.put(courseId, completedLessons);
        }

        List<Integer> activityYears = buildActivityYears(progresses, today.getYear());
        int selectedYear = resolveSelectedActivityYear(year, activityYears, today.getYear());

        List<ProgressTimelinePointResponse> dailyCompletions = buildDailyCompletionSeries(progresses, selectedYear);
        List<ProgressTimelinePointResponse> weeklyCompletions = buildWeeklyCompletionSeries(progresses, today);
        List<ProgressQuizInsightResponse> independentQuizzes = buildIndependentQuizInsights(attempts);
        List<ProgressPausedLessonResponse> pausedLessons = buildPausedLessonInsights(progresses);
        List<ProgressRiskCourseResponse> atRiskCourses =
                buildAtRiskCourseInsights(enrollments, totalLessonsByCourse, completedLessonsByCourse, today);

        long totalLearningSeconds = progresses.stream()
                .mapToLong(progress -> progress.getWatchedSeconds() == null ? 0 : progress.getWatchedSeconds())
                .sum();

        int totalCompletedLessons = (int) progresses.stream()
                .filter(progress -> Boolean.TRUE.equals(progress.getCompleted()))
                .count();

        int activeCourses = (int) enrollments.stream()
                .filter(enrollment -> enrollment.getStatus() == EnrollmentStatus.ACTIVE)
                .count();

        int completedCourses = (int) enrollments.stream()
                .filter(enrollment -> enrollment.getStatus() == EnrollmentStatus.COMPLETED)
                .count();

        double averageProgress = enrollments.isEmpty()
                ? 0.0
                : enrollments.stream()
                        .mapToDouble(enrollment -> enrollment.getProgressPercent() == null ? 0.0 : enrollment.getProgressPercent())
                        .average()
                        .orElse(0.0);

        return ProgressDashboardResponse.builder()
                .summary(ProgressSummaryResponse.builder()
                        .totalLearningSeconds(totalLearningSeconds)
                        .totalCompletedLessons(totalCompletedLessons)
                        .activeCourses(activeCourses)
                        .completedCourses(completedCourses)
                        .totalIndependentQuizAttempts(independentQuizzes.stream()
                                .mapToInt(item -> item.getAttemptCount() == null ? 0 : item.getAttemptCount())
                                .sum())
                        .averageProgressPercent(roundTwoDecimals(averageProgress))
                        .build())
                .dailyCompletions(dailyCompletions)
                .weeklyCompletions(weeklyCompletions)
                .independentQuizzes(independentQuizzes)
                .pausedLessons(pausedLessons)
                .atRiskCourses(atRiskCourses)
                .activityYears(activityYears)
                .selectedYear(selectedYear)
                .build();
    }

    @Transactional
    public EnrollmentResponse markEnrollmentAccess(String courseId) {
        if (courseId == null || courseId.isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        String username = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(user.getId(), courseId.trim())
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        enrollment.setLastAccessedAt(LocalDateTime.now());
        enrollment = enrollmentRepository.save(enrollment);

        return enrollmentMapper.toEnrollmentResponse(enrollment);
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    private boolean requiresPayment(Course course) {
        if (!Boolean.TRUE.equals(course.getPaid())) {
            return false;
        }
        BigDecimal price = course.getPrice();
        return price != null && price.compareTo(BigDecimal.ZERO) > 0;
    }

    private List<Integer> buildActivityYears(List<LessonProgress> progresses, int fallbackYear) {
        List<Integer> years = progresses.stream()
                .filter(progress -> Boolean.TRUE.equals(progress.getCompleted()) && progress.getCompletedAt() != null)
                .map(progress -> progress.getCompletedAt().getYear())
                .distinct()
                .sorted(Comparator.reverseOrder())
                .toList();

        return years.isEmpty() ? List.of(fallbackYear) : years;
    }

    private int resolveSelectedActivityYear(Integer requestedYear, List<Integer> activityYears, int fallbackYear) {
        if (requestedYear != null && activityYears.contains(requestedYear)) {
            return requestedYear;
        }

        if (activityYears.contains(fallbackYear)) {
            return fallbackYear;
        }

        return activityYears.isEmpty() ? fallbackYear : activityYears.get(0);
    }

    private List<ProgressTimelinePointResponse> buildDailyCompletionSeries(
            List<LessonProgress> progresses,
            int selectedYear) {
        LocalDate yearStart = LocalDate.of(selectedYear, 1, 1);
        LocalDate yearEnd = LocalDate.of(selectedYear, 12, 31);
        LocalDate startDate = yearStart.with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        LocalDate endDate = yearEnd.with(TemporalAdjusters.nextOrSame(java.time.DayOfWeek.SUNDAY));
        Map<LocalDate, Long> completionMap = progresses.stream()
                .filter(progress -> Boolean.TRUE.equals(progress.getCompleted()) && progress.getCompletedAt() != null)
                .map(progress -> progress.getCompletedAt().toLocalDate())
                .filter(date -> !date.isBefore(yearStart) && !date.isAfter(yearEnd))
                .collect(Collectors.groupingBy(date -> date, LinkedHashMap::new, Collectors.counting()));

        List<ProgressTimelinePointResponse> result = new ArrayList<>();
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            result.add(ProgressTimelinePointResponse.builder()
                    .key(date.toString())
                    .label(String.format("%02d/%02d", date.getDayOfMonth(), date.getMonthValue()))
                    .value(completionMap.getOrDefault(date, 0L))
                    .build());
        }
        return result;
    }

    private List<ProgressTimelinePointResponse> buildWeeklyCompletionSeries(
            List<LessonProgress> progresses,
            LocalDate today) {
        LocalDate currentWeekStart = today.with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        LocalDate startWeek = currentWeekStart.minusWeeks(5);

        Map<LocalDate, Long> completionMap = progresses.stream()
                .filter(progress -> Boolean.TRUE.equals(progress.getCompleted()) && progress.getCompletedAt() != null)
                .map(progress -> progress.getCompletedAt().toLocalDate()
                        .with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)))
                .filter(date -> !date.isBefore(startWeek) && !date.isAfter(currentWeekStart))
                .collect(Collectors.groupingBy(date -> date, LinkedHashMap::new, Collectors.counting()));

        List<ProgressTimelinePointResponse> result = new ArrayList<>();
        for (int index = 0; index < 6; index++) {
            LocalDate weekStart = startWeek.plusWeeks(index);
            LocalDate weekEnd = weekStart.plusDays(6);
            result.add(ProgressTimelinePointResponse.builder()
                    .key(weekStart.toString())
                    .label(String.format("%02d/%02d-%02d/%02d",
                            weekStart.getDayOfMonth(),
                            weekStart.getMonthValue(),
                            weekEnd.getDayOfMonth(),
                            weekEnd.getMonthValue()))
                    .value(completionMap.getOrDefault(weekStart, 0L))
                    .build());
        }
        return result;
    }

    private List<ProgressQuizInsightResponse> buildIndependentQuizInsights(List<QuizAttempt> attempts) {
        Map<String, List<QuizAttempt>> attemptsByQuiz = attempts.stream()
                .filter(attempt -> attempt.getQuiz() != null)
                .filter(attempt -> attempt.getQuiz().getLesson() == null)
                .collect(Collectors.groupingBy(attempt -> attempt.getQuiz().getId(), LinkedHashMap::new, Collectors.toList()));

        return attemptsByQuiz.values().stream()
                .map(quizAttempts -> {
                    Quiz quiz = quizAttempts.get(0).getQuiz();
                    List<QuizAttempt> submittedAttempts = quizAttempts.stream()
                            .filter(attempt -> attempt.getSubmittedAt() != null)
                            .sorted(Comparator.comparing(QuizAttempt::getSubmittedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                                    .reversed())
                            .toList();

                    QuizAttempt latestAttempt = submittedAttempts.isEmpty() ? quizAttempts.get(0) : submittedAttempts.get(0);

                    double bestScore = quizAttempts.stream()
                            .mapToDouble(this::calculateScorePercent)
                            .max()
                            .orElse(0.0);

                    return ProgressQuizInsightResponse.builder()
                            .quizId(quiz.getId())
                            .title(quiz.getTitle())
                            .quizScope(quiz.getQuizScope())
                            .attemptCount(quizAttempts.size())
                            .bestScorePercent(roundTwoDecimals(bestScore))
                            .lastScorePercent(roundTwoDecimals(calculateScorePercent(latestAttempt)))
                            .lastSubmittedAt(latestAttempt.getSubmittedAt())
                            .build();
                })
                .sorted(Comparator.comparing(ProgressQuizInsightResponse::getLastSubmittedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(6)
                .toList();
    }

    private List<ProgressPausedLessonResponse> buildPausedLessonInsights(List<LessonProgress> progresses) {
        return progresses.stream()
                .filter(progress -> !Boolean.TRUE.equals(progress.getCompleted()))
                .filter(progress -> safeInt(progress.getWatchedSeconds()) > 0 || safeInt(progress.getLastPositionSec()) > 0)
                .filter(progress -> progress.getLesson() != null)
                .sorted(Comparator
                        .comparing((LessonProgress progress) -> progress.getLastAccessedAt(), Comparator.nullsLast(Comparator.naturalOrder()))
                        .reversed()
                        .thenComparing(progress -> safeInt(progress.getWatchedSeconds()), Comparator.reverseOrder()))
                .limit(6)
                .map(progress -> {
                    Lesson lesson = progress.getLesson();
                    int durationSeconds = Math.max(lesson.getDurationMinutes() == null ? 0 : lesson.getDurationMinutes() * 60, 0);
                    double completionPercent = durationSeconds <= 0
                            ? 0.0
                            : Math.min(100.0, (safeInt(progress.getLastPositionSec()) * 100.0) / durationSeconds);

                    return ProgressPausedLessonResponse.builder()
                            .courseId(lesson.getSection() != null && lesson.getSection().getCourse() != null
                                    ? lesson.getSection().getCourse().getId()
                                    : null)
                            .courseTitle(lesson.getSection() != null && lesson.getSection().getCourse() != null
                                    ? lesson.getSection().getCourse().getTitle()
                                    : null)
                            .courseThumbnailUrl(lesson.getSection() != null
                                    && lesson.getSection().getCourse() != null
                                    ? lesson.getSection().getCourse().getThumbnailUrl()
                                    : null)
                            .lessonId(lesson.getId())
                            .lessonTitle(lesson.getTitle())
                            .watchedSeconds(safeInt(progress.getWatchedSeconds()))
                            .lastPositionSec(safeInt(progress.getLastPositionSec()))
                            .completionPercent(roundTwoDecimals(completionPercent))
                            .lastAccessedAt(progress.getLastAccessedAt())
                            .build();
                })
                .toList();
    }

    private List<ProgressRiskCourseResponse> buildAtRiskCourseInsights(
            List<Enrollment> enrollments,
            Map<String, Integer> totalLessonsByCourse,
            Map<String, Integer> completedLessonsByCourse,
            LocalDate today) {
        return enrollments.stream()
                .filter(enrollment -> enrollment.getCourse() != null)
                .filter(enrollment -> enrollment.getStatus() == EnrollmentStatus.ACTIVE)
                .map(enrollment -> {
                    Course course = enrollment.getCourse();
                    long daysSinceEnrollment = enrollment.getEnrolledAt() == null
                            ? 0
                            : Math.max(0, ChronoUnit.DAYS.between(enrollment.getEnrolledAt().toLocalDate(), today));
                    long daysSinceLastAccess = enrollment.getLastAccessedAt() == null
                            ? daysSinceEnrollment
                            : Math.max(0, ChronoUnit.DAYS.between(enrollment.getLastAccessedAt().toLocalDate(), today));

                    int totalLessons = totalLessonsByCourse.getOrDefault(course.getId(), 0);
                    int completedLessons = completedLessonsByCourse.getOrDefault(course.getId(), 0);
                    double progressPercent = enrollment.getProgressPercent() == null ? 0.0 : enrollment.getProgressPercent();

                    int targetDays = course.getEstimatedHours() == null || course.getEstimatedHours() <= 0
                            ? 21
                            : Math.max(7, course.getEstimatedHours() * 3);
                    double expectedProgress = Math.min(100.0, (daysSinceEnrollment * 100.0) / targetDays);
                    double gap = expectedProgress - progressPercent;

                    String riskLevel = null;
                    String reason = null;

                    if (daysSinceLastAccess >= 7 && progressPercent < 80) {
                        riskLevel = "HIGH";
                        reason = "Khong truy cap trong " + daysSinceLastAccess + " ngay.";
                    } else if (daysSinceEnrollment >= 14 && completedLessons == 0) {
                        riskLevel = "HIGH";
                        reason = "Da ghi danh lau nhung chua hoan thanh bai hoc nao.";
                    } else if (gap >= 25) {
                        riskLevel = "MEDIUM";
                        reason = "Tien do hien tai cham hon muc du kien " + Math.round(gap) + "%.";
                    } else if (daysSinceLastAccess >= 4 && progressPercent < 60) {
                        riskLevel = "MEDIUM";
                        reason = "Sap bi gian doan nhip hoc do it truy cap gan day.";
                    }

                    if (riskLevel == null) {
                        return null;
                    }

                    return ProgressRiskCourseResponse.builder()
                            .courseId(course.getId())
                            .courseTitle(course.getTitle())
                            .courseThumbnailUrl(course.getThumbnailUrl())
                            .progressPercent(roundTwoDecimals(progressPercent))
                            .expectedProgressPercent(roundTwoDecimals(expectedProgress))
                            .totalLessons(totalLessons)
                            .completedLessons(completedLessons)
                            .daysSinceEnrollment(daysSinceEnrollment)
                            .daysSinceLastAccess(daysSinceLastAccess)
                            .riskLevel(riskLevel)
                            .reason(reason)
                            .lastAccessedAt(enrollment.getLastAccessedAt())
                            .build();
                })
                .filter(item -> item != null)
                .sorted(Comparator
                        .comparing((ProgressRiskCourseResponse item) -> "HIGH".equals(item.getRiskLevel()) ? 0 : 1)
                        .thenComparing(item -> item.getDaysSinceLastAccess() == null ? 0L : item.getDaysSinceLastAccess(), Comparator.reverseOrder()))
                .limit(6)
                .toList();
    }

    private double calculateScorePercent(QuizAttempt attempt) {
        if (attempt == null || attempt.getTotalScore() == null || attempt.getTotalScore() <= 0) {
            return 0.0;
        }
        return (safeDouble(attempt.getScore()) * 100.0) / attempt.getTotalScore();
    }

    private double roundTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private double safeDouble(Double value) {
        return value == null ? 0.0 : value;
    }
}
