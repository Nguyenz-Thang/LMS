package com.nt.lms.service;

import com.nt.lms.dto.response.AdminReportCourseStatResponse;
import com.nt.lms.dto.response.AdminReportDashboardResponse;
import com.nt.lms.dto.response.AdminReportInstructorStatResponse;
import com.nt.lms.dto.response.AdminReportLearnerStatResponse;
import com.nt.lms.dto.response.AdminReportSummaryResponse;
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
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
    public AdminReportDashboardResponse getDashboard(
            String fromDate,
            String toDate,
            String courseId,
            String learnerId,
            String instructorId,
            String status) {
        User currentUser = getCurrentUser();
        boolean isAdmin = hasRole(currentUser, "ADMIN");
        ReportFilter filter = ReportFilter.from(fromDate, toDate, courseId, learnerId, instructorId, status);

        List<Course> scopedCourses = courseRepository.findAll().stream()
                .filter(course -> isAdmin || isOwnedBy(course, currentUser))
                .filter(course -> isBlank(filter.courseId()) || filter.courseId().equals(course.getId()))
                .filter(course -> isBlank(filter.instructorId())
                        || (course.getInstructor() != null && filter.instructorId().equals(course.getInstructor().getId())))
                .toList();

        Set<String> scopedCourseIds = scopedCourses.stream()
                .map(Course::getId)
                .collect(Collectors.toSet());

        List<Enrollment> scopedEnrollments = enrollmentRepository.findAll().stream()
                .filter(enrollment -> enrollment.getCourse() != null)
                .filter(enrollment -> scopedCourseIds.contains(enrollment.getCourse().getId()))
                .filter(enrollment -> isBlank(filter.learnerId())
                        || (enrollment.getUser() != null && filter.learnerId().equals(enrollment.getUser().getId())))
                .filter(enrollment -> isBlank(filter.status())
                        || (enrollment.getStatus() != null && filter.status().equalsIgnoreCase(enrollment.getStatus().name())))
                .toList();
        List<Enrollment> statusFilteredEnrollments = scopedEnrollments;

        List<LessonProgress> scopedProgresses = lessonProgressRepository.findAll().stream()
                .filter(progress -> getCourseId(progress) != null)
                .filter(progress -> scopedCourseIds.contains(getCourseId(progress)))
                .filter(progress -> isBlank(filter.learnerId())
                        || (progress.getUser() != null && filter.learnerId().equals(progress.getUser().getId())))
                .filter(progress -> matchesEnrollmentStatus(progress, statusFilteredEnrollments, filter))
                .filter(progress -> isWithinDateRange(
                        firstPresent(progress.getLastAccessedAt(), progress.getUpdatedAt(), progress.getCreatedAt()),
                        filter.fromDate(),
                        filter.toDate()))
                .toList();

        List<QuizAttempt> scopedQuizAttempts = quizAttemptRepository.findAll().stream()
                .filter(attempt -> getCourseId(attempt) != null)
                .filter(attempt -> scopedCourseIds.contains(getCourseId(attempt)))
                .filter(attempt -> isBlank(filter.learnerId())
                        || (attempt.getUser() != null && filter.learnerId().equals(attempt.getUser().getId())))
                .filter(attempt -> matchesEnrollmentStatus(attempt, statusFilteredEnrollments, filter))
                .filter(attempt -> isWithinDateRange(
                        firstPresent(attempt.getSubmittedAt(), attempt.getStartedAt()),
                        filter.fromDate(),
                        filter.toDate()))
                .toList();

        scopedEnrollments = filterRelevantEnrollments(scopedEnrollments, scopedProgresses, scopedQuizAttempts, filter);

        Set<String> reportCourseIds = collectReportCourseIds(scopedEnrollments, scopedProgresses, scopedQuizAttempts);
        boolean hasDataFilter = filter.hasDataFilter();
        List<Course> reportCourses = scopedCourses.stream()
                .filter(course -> !hasDataFilter || reportCourseIds.contains(course.getId()))
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

        Map<String, List<Lesson>> reportLessonsByCourse = lessonsByCourse.entrySet().stream()
                .filter(entry -> reportCourseIds.contains(entry.getKey()) || !hasDataFilter)
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (left, right) -> left,
                        LinkedHashMap::new));

        AdminReportSummaryResponse summary = buildSummary(reportCourses, scopedEnrollments, scopedProgresses, scopedQuizAttempts, reportLessonsByCourse);

        return AdminReportDashboardResponse.builder()
                .scope(isAdmin ? "ADMIN" : "INSTRUCTOR")
                .summary(summary)
                .topCourses(buildTopCourseStats(reportCourses, scopedEnrollments, scopedProgresses, scopedQuizAttempts))
                .learners(buildLearnerStats(scopedEnrollments, scopedProgresses, scopedQuizAttempts, reportLessonsByCourse))
                .topInstructors(isAdmin ? buildTopInstructorStats(reportCourses, scopedEnrollments) : List.of())
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

    private List<Enrollment> filterRelevantEnrollments(
            List<Enrollment> enrollments,
            List<LessonProgress> progresses,
            List<QuizAttempt> attempts,
            ReportFilter filter) {
        if (!filter.hasDateFilter()) {
            return enrollments;
        }

        Set<String> activeKeys = new java.util.HashSet<>();
        progresses.stream()
                .filter(progress -> progress.getUser() != null && getCourseId(progress) != null)
                .map(progress -> enrollmentKey(getCourseId(progress), progress.getUser().getId()))
                .forEach(activeKeys::add);
        attempts.stream()
                .filter(attempt -> attempt.getUser() != null && getCourseId(attempt) != null)
                .map(attempt -> enrollmentKey(getCourseId(attempt), attempt.getUser().getId()))
                .forEach(activeKeys::add);

        return enrollments.stream()
                .filter(enrollment -> isWithinDateRange(enrollment.getEnrolledAt(), filter.fromDate(), filter.toDate())
                        || (enrollment.getCourse() != null
                        && enrollment.getUser() != null
                        && activeKeys.contains(enrollmentKey(enrollment.getCourse().getId(), enrollment.getUser().getId()))))
                .toList();
    }

    private Set<String> collectReportCourseIds(
            List<Enrollment> enrollments,
            List<LessonProgress> progresses,
            List<QuizAttempt> attempts) {
        Set<String> courseIds = new java.util.HashSet<>();
        enrollments.stream()
                .filter(enrollment -> enrollment.getCourse() != null)
                .map(enrollment -> enrollment.getCourse().getId())
                .forEach(courseIds::add);
        progresses.stream()
                .map(this::getCourseId)
                .filter(id -> id != null)
                .forEach(courseIds::add);
        attempts.stream()
                .map(this::getCourseId)
                .filter(id -> id != null)
                .forEach(courseIds::add);
        return courseIds;
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
                .toList();
    }

    private List<AdminReportLearnerStatResponse> buildLearnerStats(
            List<Enrollment> enrollments,
            List<LessonProgress> progresses,
            List<QuizAttempt> attempts,
            Map<String, List<Lesson>> lessonsByCourse) {
        Map<String, List<LessonProgress>> progressesByCourseAndUser = progresses.stream()
                .filter(progress -> progress.getUser() != null && getCourseId(progress) != null)
                .collect(Collectors.groupingBy(progress -> enrollmentKey(getCourseId(progress), progress.getUser().getId())));
        Map<String, List<QuizAttempt>> attemptsByCourseAndUser = attempts.stream()
                .filter(attempt -> attempt.getUser() != null && getCourseId(attempt) != null)
                .collect(Collectors.groupingBy(attempt -> enrollmentKey(getCourseId(attempt), attempt.getUser().getId())));

        return enrollments.stream()
                .filter(enrollment -> enrollment.getCourse() != null && enrollment.getUser() != null)
                .map(enrollment -> {
                    String courseId = enrollment.getCourse().getId();
                    String userId = enrollment.getUser().getId();
                    String key = enrollmentKey(courseId, userId);
                    List<LessonProgress> learnerProgresses = progressesByCourseAndUser.getOrDefault(key, List.of());
                    List<QuizAttempt> learnerAttempts = attemptsByCourseAndUser.getOrDefault(key, List.of());

                    int completedLessons = (int) learnerProgresses.stream()
                            .filter(progress -> Boolean.TRUE.equals(progress.getCompleted()))
                            .count();
                    int totalLessons = lessonsByCourse.getOrDefault(courseId, List.of()).size();
                    double learningHours = learnerProgresses.stream()
                            .mapToLong(progress -> safeInt(progress.getWatchedSeconds()))
                            .sum() / 3600.0;
                    double averageQuizScore = learnerAttempts.stream()
                            .filter(attempt -> attempt.getSubmittedAt() != null)
                            .mapToDouble(this::calculateScorePercent)
                            .average()
                            .orElse(0.0);

                    return AdminReportLearnerStatResponse.builder()
                            .userId(userId)
                            .username(enrollment.getUser().getUsername())
                            .learnerName(getUserDisplayName(enrollment.getUser()))
                            .courseId(courseId)
                            .courseTitle(enrollment.getCourse().getTitle())
                            .instructorName(getUserDisplayName(enrollment.getCourse().getInstructor()))
                            .status(enrollment.getStatus() != null ? enrollment.getStatus().name() : null)
                            .enrolledAt(enrollment.getEnrolledAt())
                            .lastAccessedAt(latestAccessedAt(enrollment, learnerProgresses))
                            .progressPercent(roundTwoDecimals(safeDouble(enrollment.getProgressPercent())))
                            .completedLessons(completedLessons)
                            .totalLessons(totalLessons)
                            .quizAttemptCount(learnerAttempts.size())
                            .averageQuizScorePercent(roundTwoDecimals(averageQuizScore))
                            .learningHours(roundTwoDecimals(learningHours))
                            .build();
                })
                .sorted(Comparator
                        .comparing(AdminReportLearnerStatResponse::getCourseTitle, Comparator.nullsLast(String::compareToIgnoreCase))
                        .thenComparing(AdminReportLearnerStatResponse::getLearnerName, Comparator.nullsLast(String::compareToIgnoreCase)))
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
                .toList();
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    private boolean matchesEnrollmentStatus(
            LessonProgress progress,
            List<Enrollment> enrollments,
            ReportFilter filter) {
        if (isBlank(filter.status())) {
            return true;
        }
        if (progress.getUser() == null || getCourseId(progress) == null) {
            return false;
        }
        return hasEnrollmentWithStatus(getCourseId(progress), progress.getUser().getId(), enrollments, filter.status());
    }

    private boolean matchesEnrollmentStatus(
            QuizAttempt attempt,
            List<Enrollment> enrollments,
            ReportFilter filter) {
        if (isBlank(filter.status())) {
            return true;
        }
        if (attempt.getUser() == null || getCourseId(attempt) == null) {
            return false;
        }
        return hasEnrollmentWithStatus(getCourseId(attempt), attempt.getUser().getId(), enrollments, filter.status());
    }

    private boolean hasEnrollmentWithStatus(
            String courseId,
            String userId,
            List<Enrollment> enrollments,
            String status) {
        return enrollments.stream()
                .anyMatch(enrollment -> enrollment.getCourse() != null
                        && enrollment.getUser() != null
                        && courseId.equals(enrollment.getCourse().getId())
                        && userId.equals(enrollment.getUser().getId())
                        && enrollment.getStatus() != null
                        && status.equalsIgnoreCase(enrollment.getStatus().name()));
    }

    private LocalDateTime latestAccessedAt(Enrollment enrollment, List<LessonProgress> progresses) {
        LocalDateTime latest = enrollment.getLastAccessedAt();
        for (LessonProgress progress : progresses) {
            LocalDateTime progressTime = progress.getLastAccessedAt();
            if (progressTime != null && (latest == null || progressTime.isAfter(latest))) {
                latest = progressTime;
            }
        }
        return latest;
    }

    private String enrollmentKey(String courseId, String userId) {
        return courseId + ":" + userId;
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

    private boolean isWithinDateRange(LocalDateTime value, LocalDate fromDate, LocalDate toDate) {
        if (value == null) {
            return fromDate == null && toDate == null;
        }
        LocalDate date = value.toLocalDate();
        return (fromDate == null || !date.isBefore(fromDate))
                && (toDate == null || !date.isAfter(toDate));
    }

    private LocalDateTime firstPresent(LocalDateTime... values) {
        for (LocalDateTime value : values) {
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record ReportFilter(
            LocalDate fromDate,
            LocalDate toDate,
            String courseId,
            String learnerId,
            String instructorId,
            String status) {

        private boolean hasDateFilter() {
            return fromDate != null || toDate != null;
        }

        private boolean hasDataFilter() {
            return hasDateFilter() || learnerId != null || status != null;
        }

        private static ReportFilter from(
                String fromDate,
                String toDate,
                String courseId,
                String learnerId,
                String instructorId,
                String status) {
            return new ReportFilter(
                    parseDate(fromDate),
                    parseDate(toDate),
                    trimToNull(courseId),
                    trimToNull(learnerId),
                    trimToNull(instructorId),
                    trimToNull(status));
        }

        private static LocalDate parseDate(String value) {
            String cleanValue = trimToNull(value);
            if (cleanValue == null) {
                return null;
            }
            try {
                return LocalDate.parse(cleanValue);
            } catch (DateTimeParseException ignored) {
                return null;
            }
        }

        private static String trimToNull(String value) {
            if (value == null || value.isBlank()) {
                return null;
            }
            return value.trim();
        }
    }
}
