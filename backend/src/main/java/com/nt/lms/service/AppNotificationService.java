package com.nt.lms.service;

import com.nt.lms.dto.response.AppNotificationResponse;
import com.nt.lms.entity.AppNotification;
import com.nt.lms.entity.Assignment;
import com.nt.lms.entity.AssignmentSubmission;
import com.nt.lms.entity.Course;
import com.nt.lms.entity.Enrollment;
import com.nt.lms.entity.User;
import com.nt.lms.enums.EnrollmentStatus;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.repository.AppNotificationRepository;
import com.nt.lms.repository.EnrollmentRepository;
import com.nt.lms.repository.UserRepository;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AppNotificationService {

    private static final String REMINDER_TYPE = "LEARNING_REMINDER";
    private static final int REMINDER_AFTER_DAYS = 7;

    private final AppNotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;

    @Transactional
    public List<AppNotificationResponse> getMine() {
        User currentUser = getCurrentUser();
        createLearningRemindersIfNeeded(currentUser);

        return notificationRepository.findTop20ByUserIdOrderByCreatedAtDesc(currentUser.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public AppNotificationResponse markRead(String notificationId) {
        User currentUser = getCurrentUser();
        AppNotification notification = notificationRepository.findByIdAndUserId(notificationId, currentUser.getId())
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));
        notification.setRead(true);
        return toResponse(notificationRepository.save(notification));
    }

    @Transactional
    public void markAllRead() {
        User currentUser = getCurrentUser();
        List<AppNotification> notifications = notificationRepository.findTop20ByUserIdOrderByCreatedAtDesc(currentUser.getId());
        notifications.forEach(notification -> notification.setRead(true));
        notificationRepository.saveAll(notifications);
    }

    @Transactional
    public void notifyCourseEnrollment(Enrollment enrollment, boolean paidPurchase) {
        if (enrollment == null || enrollment.getUser() == null || enrollment.getCourse() == null) {
            return;
        }

        Course course = enrollment.getCourse();
        String studentTitle = paidPurchase ? "Thanh toán khóa học thành công" : "Đăng ký khóa học thành công";
        create(
                enrollment.getUser(),
                paidPurchase ? "COURSE_PURCHASED" : "COURSE_ENROLLED",
                studentTitle,
                "Bạn đã có thể bắt đầu học khóa \"" + safeTitle(course) + "\".",
                "/courses/" + course.getId());

        User instructor = course.getInstructor();
        if (instructor != null && !Objects.equals(instructor.getId(), enrollment.getUser().getId())) {
            create(
                    instructor,
                    "INSTRUCTOR_NEW_ENROLLMENT",
                    "Có học viên mới đăng ký",
                    getUserDisplayName(enrollment.getUser()) + " vừa đăng ký khóa \"" + safeTitle(course) + "\".",
                    "/admin/enrollments");
        }
    }

    @Transactional
    public void notifyAssignmentSubmitted(AssignmentSubmission submission) {
        if (submission == null || submission.getAssignment() == null) {
            return;
        }

        Assignment assignment = submission.getAssignment();
        Course course = assignment.getCourse();
        User instructor = course != null ? course.getInstructor() : assignment.getCreatedBy();
        if (instructor == null) {
            return;
        }

        create(
                instructor,
                "ASSIGNMENT_SUBMITTED",
                "Có bài tập mới được nộp",
                getUserDisplayName(submission.getStudent()) + " đã nộp bài \"" + assignment.getTitle() + "\".",
                "/admin/assignments/" + assignment.getId() + "/submissions");
    }

    @Transactional
    public void notifyAssignmentGraded(AssignmentSubmission submission) {
        if (submission == null || submission.getStudent() == null || submission.getAssignment() == null) {
            return;
        }

        Assignment assignment = submission.getAssignment();
        Course course = assignment.getCourse();
        String targetUrl = course != null ? "/learning/" + course.getId() : "/my-courses";
        String scoreText = submission.getScore() == null ? "" : " Điểm: " + submission.getScore() + ".";

        create(
                submission.getStudent(),
                "ASSIGNMENT_GRADED",
                "Bài tập đã được chấm điểm",
                "Bài \"" + assignment.getTitle() + "\" đã có kết quả." + scoreText,
                targetUrl);
    }

    @Transactional
    public void notifyCoursePendingApproval(Course course) {
        if (course == null) {
            return;
        }

        List<User> admins = userRepository.findAll().stream()
                .filter(user -> hasRole(user, "ADMIN"))
                .toList();

        createForUsers(
                admins,
                "COURSE_PENDING_APPROVAL",
                "Khóa học mới chờ duyệt",
                "Khóa \"" + safeTitle(course) + "\" đang chờ admin duyệt.",
                "/admin/courses");
    }

    private void createLearningRemindersIfNeeded(User currentUser) {
        LocalDate today = LocalDate.now();
        enrollmentRepository.findByUserIdAndStatus(currentUser.getId(), EnrollmentStatus.ACTIVE).stream()
                .filter(enrollment -> enrollment.getCourse() != null)
                .filter(enrollment -> safeProgress(enrollment) < 100.0)
                .forEach(enrollment -> {
                    LocalDate lastAccessDate = enrollment.getLastAccessedAt() != null
                            ? enrollment.getLastAccessedAt().toLocalDate()
                            : enrollment.getEnrolledAt() != null ? enrollment.getEnrolledAt().toLocalDate() : today;
                    long inactiveDays = ChronoUnit.DAYS.between(lastAccessDate, today);
                    String targetUrl = "/learning/" + enrollment.getCourse().getId();

                    if (inactiveDays >= REMINDER_AFTER_DAYS
                            && !notificationRepository.existsByUserIdAndTypeAndTargetUrlAndReadFalse(
                                    currentUser.getId(), REMINDER_TYPE, targetUrl)) {
                        create(
                                currentUser,
                                REMINDER_TYPE,
                                "Nhắc học tiếp",
                                "Bạn đã " + inactiveDays + " ngày chưa vào khóa \"" + safeTitle(enrollment.getCourse()) + "\".",
                                targetUrl);
                    }
                });
    }

    private void createForUsers(Collection<User> users, String type, String title, String message, String targetUrl) {
        if (users == null || users.isEmpty()) {
            return;
        }
        users.forEach(user -> create(user, type, title, message, targetUrl));
    }

    private AppNotification create(User user, String type, String title, String message, String targetUrl) {
        return notificationRepository.save(AppNotification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .targetUrl(targetUrl)
                .read(false)
                .build());
    }

    private AppNotificationResponse toResponse(AppNotification notification) {
        return AppNotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .targetUrl(notification.getTargetUrl())
                .read(Boolean.TRUE.equals(notification.getRead()))
                .createdAt(notification.getCreatedAt())
                .build();
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    private boolean hasRole(User user, String roleName) {
        return user.getRoles() != null && user.getRoles().stream().anyMatch(role -> roleName.equals(role.getName()));
    }

    private String getUserDisplayName(User user) {
        if (user == null) {
            return "Người dùng";
        }
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }
        return user.getUsername();
    }

    private String safeTitle(Course course) {
        return course.getTitle() == null || course.getTitle().isBlank() ? "Khóa học" : course.getTitle();
    }

    private double safeProgress(Enrollment enrollment) {
        return enrollment.getProgressPercent() == null ? 0.0 : enrollment.getProgressPercent();
    }
}
