package com.nt.lms.service;

import com.nt.lms.dto.response.AdminReportAlertResponse;
import com.nt.lms.dto.response.AdminReportCourseStatResponse;
import com.nt.lms.dto.response.AdminReportDashboardResponse;
import com.nt.lms.dto.response.AdminReportInstructorStatResponse;
import com.nt.lms.dto.response.AdminReportSummaryResponse;
import com.nt.lms.dto.response.AdminReportTrendPointResponse;
import com.nt.lms.entity.Course;
import com.nt.lms.entity.Enrollment;
import com.nt.lms.entity.Lesson;
import com.nt.lms.entity.LessonProgress;
import com.nt.lms.entity.QuizAttempt;
import com.nt.lms.entity.Section;
import com.nt.lms.entity.User;
import com.nt.lms.enums.EnrollmentStatus;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.repository.CourseRepository;
import com.nt.lms.repository.EnrollmentRepository;
import com.nt.lms.repository.LessonProgressRepository;
import com.nt.lms.repository.LessonRepository;
import com.nt.lms.repository.QuizAttemptRepository;
import com.nt.lms.repository.SectionRepository;
import com.nt.lms.repository.UserRepository;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReportService {

    CourseRepository courseRepository;
    EnrollmentRepository enrollmentRepository;
    LessonRepository lessonRepository;
    LessonProgressRepository lessonProgressRepository;
    QuizAttemptRepository quizAttemptRepository;
    SectionRepository sectionRepository;
    UserRepository userRepository;

    @Transactional(readOnly = true)
    public AdminReportDashboardResponse getDashboard() {
        User currentUser = getCurrentUser();
        boolean isAdmin = hasRole(currentUser, "ADMIN");

        List<Course> scopedCourses = courseRepository.findAll().stream()
                .filter(course -> isAdmin || isOwnedBy(course, currentUser))
                .toList();

        Set<String> scopedCourseIds = scopedCourses.stream()
                .map(Course::getId)
                .collect(Collectors.toSet());

        List<Enrollment> scopedEnrollments = enrollmentRepository.findAll().stream()
                .filter(enrollment -> enrollment.getCourse() != null)
                .filter(enrollment -> scopedCourseIds.contains(enrollment.getCourse().getId()))
                .toList();

        List<LessonProgress> scopedProgresses = lessonProgressRepository.findAll().stream()
                .filter(progress -> getCourseId(progress) != null)
                .filter(progress -> scopedCourseIds.contains(getCourseId(progress)))
                .toList();

        List<QuizAttempt> scopedQuizAttempts = quizAttemptRepository.findAll().stream()
                .filter(attempt -> getCourseId(attempt) != null)
                .filter(attempt -> scopedCourseIds.contains(getCourseId(attempt)))
                .toList();

        Map<String, List<Section>> sectionsByCourse = sectionRepository.findAll().stream()
                .filter(section -> section.getCourse() != null)
                .filter(section -> scopedCourseIds.contains(section.getCourse().getId()))
                .collect(Collectors.groupingBy(section -> section.getCourse().getId()));

        Map<String, List<Lesson>> lessonsByCourse = new LinkedHashMap<>();
        for (Map.Entry<String, List<Section>> entry : sectionsByCourse.entrySet()) {
            List<Lesson> lessons = entry.getValue().stream()
                    .flatMap(section -> lessonRepository.findBySectionIdOrderByOrderIndexAsc(section.getId()).stream())
                    .toList();
            lessonsByCourse.put(entry.getKey(), lessons);
        }

        AdminReportSummaryResponse summary = buildSummary(scopedCourses, scopedEnrollments, scopedProgresses, scopedQuizAttempts, lessonsByCourse);

        return AdminReportDashboardResponse.builder()
                .scope(isAdmin ? "ADMIN" : "INSTRUCTOR")
                .summary(summary)
                .enrollmentTrend(buildEnrollmentTrend(scopedEnrollments))
                .topCourses(buildTopCourseStats(scopedCourses, scopedEnrollments, scopedProgresses, scopedQuizAttempts))
                .topInstructors(isAdmin ? buildTopInstructorStats(scopedCourses, scopedEnrollments) : List.of())
                .alerts(buildAlerts(scopedEnrollments, scopedProgresses))
                .build();
    }

    private AdminReportSummaryResponse buildSummary(
            List<Course> courses,
            List<Enrollment> enrollments,
            List<LessonProgress> progresses,
            List<QuizAttempt> quizAttempts,
            Map<String, List<Lesson>> lessonsByCourse) {
        double averageProgress = enrollments.stream()
                .mapToDouble(item -> safeDouble(item.getProgressPercent()))
                .average()
                .orElse(0.0);

        double totalLearningHours = progresses.stream()
                .mapToLong(item -> safeInt(item.getWatchedSeconds()))
                .sum() / 3600.0;

        int totalLessons = lessonsByCourse.values().stream()
                .mapToInt(List::size)
                .sum();

        long totalLearners = enrollments.stream()
                .map(Enrollment::getUser)
                .filter(user -> user != null)
                .map(User::getId)
                .distinct()
                .count();

        return AdminReportSummaryResponse.builder()
                .totalCourses(courses.size())
                .totalLearners((int) totalLearners)
                .activeEnrollments((int) enrollments.stream().filter(item -> item.getStatus() == EnrollmentStatus.ACTIVE).count())
                .completedEnrollments((int) enrollments.stream().filter(item -> item.getStatus() == EnrollmentStatus.COMPLETED).count())
                .totalLessons(totalLessons)
                .totalQuizAttempts(quizAttempts.size())
                .averageProgressPercent(roundTwoDecimals(averageProgress))
                .totalLearningHours(roundTwoDecimals(totalLearningHours))
                .build();
    }

    private List<AdminReportTrendPointResponse> buildEnrollmentTrend(List<Enrollment> enrollments) {
        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(6);
        Map<LocalDate, Long> countByDate = enrollments.stream()
                .filter(item -> item.getEnrolledAt() != null)
                .map(item -> item.getEnrolledAt().toLocalDate())
                .filter(date -> !date.isBefore(start) && !date.isAfter(today))
                .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()));

        List<AdminReportTrendPointResponse> result = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate date = start.plusDays(i);
            result.add(AdminReportTrendPointResponse.builder()
                    .key(date.toString())
                    .label(date.getDayOfWeek().name().substring(0, 3))
                    .value(countByDate.getOrDefault(date, 0L))
                    .build());
        }
        return result;
    }

    private List<AdminReportCourseStatResponse> buildTopCourseStats(
            List<Course> courses,
            List<Enrollment> enrollments,
            List<LessonProgress> progresses,
            List<QuizAttempt> attempts) {
        Map<String, List<Enrollment>> enrollmentsByCourse = enrollments.stream()
                .filter(item -> item.getCourse() != null)
                .collect(Collectors.groupingBy(item -> item.getCourse().getId()));
        Map<String, List<LessonProgress>> progressesByCourse = progresses.stream()
                .filter(item -> getCourseId(item) != null)
                .collect(Collectors.groupingBy(this::getCourseId));
        Map<String, List<QuizAttempt>> attemptsByCourse = attempts.stream()
                .filter(item -> getCourseId(item) != null)
                .collect(Collectors.groupingBy(this::getCourseId));

        return courses.stream()
                .map(course -> {
                    List<Enrollment> courseEnrollments = enrollmentsByCourse.getOrDefault(course.getId(), List.of());
                    List<LessonProgress> courseProgresses = progressesByCourse.getOrDefault(course.getId(), List.of());
                    List<QuizAttempt> courseAttempts = attemptsByCourse.getOrDefault(course.getId(), List.of());

                    double averageProgress = courseEnrollments.stream()
                            .mapToDouble(item -> safeDouble(item.getProgressPercent()))
                            .average()
                            .orElse(0.0);

                    double averageQuizScore = courseAttempts.stream()
                            .filter(item -> item.getSubmittedAt() != null)
                            .mapToDouble(this::calculateScorePercent)
                            .average()
                            .orElse(0.0);

                    double totalLearningHours = courseProgresses.stream()
                            .mapToLong(item -> safeInt(item.getWatchedSeconds()))
                            .sum() / 3600.0;

                    return AdminReportCourseStatResponse.builder()
                            .courseId(course.getId())
                            .courseTitle(course.getTitle())
                            .instructorId(course.getInstructor() != null ? course.getInstructor().getId() : null)
                            .instructorName(getUserDisplayName(course.getInstructor()))
                            .enrollmentCount(courseEnrollments.size())
                            .activeLearnerCount((int) courseEnrollments.stream().filter(item -> item.getStatus() == EnrollmentStatus.ACTIVE).count())
                            .completedLearnerCount((int) courseEnrollments.stream().filter(item -> item.getStatus() == EnrollmentStatus.COMPLETED).count())
                            .averageProgressPercent(roundTwoDecimals(averageProgress))
                            .averageQuizScorePercent(roundTwoDecimals(averageQuizScore))
                            .totalLearningHours(roundTwoDecimals(totalLearningHours))
                            .build();
                })
                .sorted(Comparator
                        .comparing(AdminReportCourseStatResponse::getEnrollmentCount, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(AdminReportCourseStatResponse::getAverageProgressPercent, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(6)
                .toList();
    }

    private List<AdminReportInstructorStatResponse> buildTopInstructorStats(
            List<Course> courses,
            List<Enrollment> enrollments) {
        Map<String, List<Course>> coursesByInstructor = courses.stream()
                .filter(course -> course.getInstructor() != null)
                .collect(Collectors.groupingBy(course -> course.getInstructor().getId()));

        return coursesByInstructor.entrySet().stream()
                .map(entry -> {
                    String instructorId = entry.getKey();
                    List<Course> instructorCourses = entry.getValue();
                    Set<String> instructorCourseIds = instructorCourses.stream().map(Course::getId).collect(Collectors.toSet());

                    List<Enrollment> instructorEnrollments = enrollments.stream()
                            .filter(item -> item.getCourse() != null)
                            .filter(item -> instructorCourseIds.contains(item.getCourse().getId()))
                            .toList();

                    long learnerCount = instructorEnrollments.stream()
                            .map(Enrollment::getUser)
                            .filter(user -> user != null)
                            .map(User::getId)
                            .distinct()
                            .count();

                    double averageProgress = instructorEnrollments.stream()
                            .mapToDouble(item -> safeDouble(item.getProgressPercent()))
                            .average()
                            .orElse(0.0);

                    return AdminReportInstructorStatResponse.builder()
                            .instructorId(instructorId)
                            .instructorName(getUserDisplayName(instructorCourses.get(0).getInstructor()))
                            .courseCount(instructorCourses.size())
                            .learnerCount((int) learnerCount)
                            .averageProgressPercent(roundTwoDecimals(averageProgress))
                            .build();
                })
                .sorted(Comparator
                        .comparing(AdminReportInstructorStatResponse::getLearnerCount, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(AdminReportInstructorStatResponse::getAverageProgressPercent, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(6)
                .toList();
    }

    private List<AdminReportAlertResponse> buildAlerts(
            List<Enrollment> enrollments,
            List<LessonProgress> progresses) {
        Map<String, LessonProgress> latestProgressByCourseAndUser = progresses.stream()
                .filter(item -> item.getUser() != null && getCourseId(item) != null)
                .collect(Collectors.toMap(
                        item -> getCourseId(item) + ":" + item.getUser().getId(),
                        Function.identity(),
                        (left, right) -> {
                            if (left.getLastAccessedAt() == null) {
                                return right;
                            }
                            if (right.getLastAccessedAt() == null) {
                                return left;
                            }
                            return left.getLastAccessedAt().isAfter(right.getLastAccessedAt()) ? left : right;
                        }));

        LocalDate today = LocalDate.now();
        return enrollments.stream()
                .filter(item -> item.getCourse() != null && item.getUser() != null)
                .map(item -> {
                    long daysSinceAccess = item.getLastAccessedAt() == null
                            ? 999
                            : ChronoUnit.DAYS.between(item.getLastAccessedAt().toLocalDate(), today);
                    double progressPercent = safeDouble(item.getProgressPercent());
                    LessonProgress latestProgress = latestProgressByCourseAndUser.get(item.getCourse().getId() + ":" + item.getUser().getId());

                    if (daysSinceAccess >= 7 && progressPercent < 80) {
                        return AdminReportAlertResponse.builder()
                                .severity("HIGH")
                                .title("Hoc vien co nguy co bo dang")
                                .description(item.getUser().getUsername() + " chua truy cap " + daysSinceAccess
                                        + " ngay, tien do hien tai " + roundTwoDecimals(progressPercent) + "%.")
                                .courseId(item.getCourse().getId())
                                .courseTitle(item.getCourse().getTitle())
                                .userId(item.getUser().getId())
                                .username(getUserDisplayName(item.getUser()))
                                .lastAccessedAt(latestProgress != null ? latestProgress.getLastAccessedAt() : item.getLastAccessedAt())
                                .build();
                    }

                    if (item.getStatus() == EnrollmentStatus.ACTIVE && progressPercent >= 85 && daysSinceAccess >= 3) {
                        return AdminReportAlertResponse.builder()
                                .severity("MEDIUM")
                                .title("Hoc vien sap hoan thanh nhung dang dung lai")
                                .description(item.getUser().getUsername() + " da dat " + roundTwoDecimals(progressPercent)
                                        + "% nhung khong truy cap gan day.")
                                .courseId(item.getCourse().getId())
                                .courseTitle(item.getCourse().getTitle())
                                .userId(item.getUser().getId())
                                .username(getUserDisplayName(item.getUser()))
                                .lastAccessedAt(latestProgress != null ? latestProgress.getLastAccessedAt() : item.getLastAccessedAt())
                                .build();
                    }

                    return null;
                })
                .filter(item -> item != null)
                .sorted(Comparator
                        .comparing((AdminReportAlertResponse item) -> "HIGH".equals(item.getSeverity()) ? 0 : 1)
                        .thenComparing(AdminReportAlertResponse::getLastAccessedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .limit(8)
                .toList();
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    private boolean hasRole(User user, String roleName) {
        return user.getRoles() != null && user.getRoles().stream().anyMatch(role -> roleName.equals(role.getName()));
    }

    private boolean isOwnedBy(Course course, User user) {
        return course.getInstructor() != null && course.getInstructor().getId().equals(user.getId());
    }

    private String getCourseId(LessonProgress progress) {
        return progress.getLesson() != null
                && progress.getLesson().getSection() != null
                && progress.getLesson().getSection().getCourse() != null
                ? progress.getLesson().getSection().getCourse().getId()
                : null;
    }

    private String getCourseId(QuizAttempt attempt) {
        if (attempt.getQuiz() == null) {
            return null;
        }
        if (attempt.getQuiz().getCourse() != null) {
            return attempt.getQuiz().getCourse().getId();
        }
        if (attempt.getQuiz().getLesson() != null
                && attempt.getQuiz().getLesson().getSection() != null
                && attempt.getQuiz().getLesson().getSection().getCourse() != null) {
            return attempt.getQuiz().getLesson().getSection().getCourse().getId();
        }
        return null;
    }

    private String getUserDisplayName(User user) {
        if (user == null) {
            return "Khong xac dinh";
        }
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }
        return user.getUsername();
    }

    private double calculateScorePercent(QuizAttempt attempt) {
        if (attempt == null || attempt.getTotalScore() == null || attempt.getTotalScore() <= 0) {
            return 0.0;
        }
        return (safeDouble(attempt.getScore()) * 100.0) / attempt.getTotalScore();
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    private double safeDouble(Double value) {
        return value == null ? 0.0 : value;
    }

    private double roundTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
