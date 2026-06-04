package com.nt.lms.service;

import com.nt.lms.entity.Assignment;
import com.nt.lms.entity.Course;
import com.nt.lms.entity.Enrollment;
import com.nt.lms.entity.Lesson;
import com.nt.lms.entity.User;
import com.nt.lms.entity.UserNotificationSetting;
import com.nt.lms.enums.EnrollmentStatus;
import com.nt.lms.repository.EnrollmentRepository;
import com.nt.lms.repository.UserNotificationSettingRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Slf4j
public class EmailNotificationService {

    final EnrollmentRepository enrollmentRepository;
    final UserNotificationSettingRepository notificationSettingRepository;
    final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${lms.mail.enabled:false}")
    boolean mailEnabled;

    @Value("${lms.mail.from:no-reply@lms.local}")
    String fromEmail;

    @Value("${lms.frontend-base-url:http://localhost:5173}")
    String frontendBaseUrl;

    public boolean sendPasswordResetEmail(User user, String resetUrl, LocalDateTime expiresAt) {
        if (!hasValidEmail(user)) {
            return false;
        }

        String subject = "[LMS] Dat lai mat khau";
        String content = """
                Xin chao %s,

                Chung toi nhan duoc yeu cau dat lai mat khau cho tai khoan cua ban.

                Vui long mo lien ket sau de tao mat khau moi:
                %s

                Lien ket co hieu luc den: %s

                Neu ban khong yeu cau dat lai mat khau, vui long bo qua email nay.

                Tran trong,
                He thong quan ly hoc tap
                """.formatted(
                safeName(user),
                resetUrl,
                expiresAt.format(DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy")));

        return sendEmail(user.getEmail(), subject, content);
    }

    public void sendManualTestEmail(User user) {
        if (!hasValidEmail(user)) {
            throw new ResponseStatusException(BAD_REQUEST, "Tài khoản chưa có email để nhận thư test");
        }

        if (!mailEnabled) {
            throw new ResponseStatusException(
                    SERVICE_UNAVAILABLE,
                    "Chưa bật gửi mail. Hãy cấu hình LMS_MAIL_ENABLED=true");
        }

        if (mailSenderProvider.getIfAvailable() == null) {
            throw new ResponseStatusException(
                    SERVICE_UNAVAILABLE,
                    "Chưa cấu hình SMTP hoặc JavaMailSender");
        }

        String subject = "[LMS] Email test cấu hình SMTP";
        String content = """
                Xin chào %s,

                Đây là email test từ hệ thống quản lý học tập.

                Nếu bạn nhận được thư này, cấu hình SMTP hiện tại đã hoạt động.

                Thời gian gửi: %s
                Trang hệ thống: %s

                Trân trọng,
                Hệ thống quản lý học tập
                """.formatted(
                safeName(user),
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy")),
                frontendBaseUrl);

        boolean sent = sendEmail(user.getEmail(), subject, content);
        if (!sent) {
            throw new ResponseStatusException(
                    SERVICE_UNAVAILABLE,
                    "Không gửi được email test. Kiểm tra lại cấu hình SMTP");
        }
    }

    public void sendNewLessonPublished(Lesson lesson) {
        if (!canNotifyForCourse(lesson.getSection().getCourse()) || !Boolean.TRUE.equals(lesson.getIsPublished())) {
            return;
        }

        List<Enrollment> enrollments = enrollmentRepository
                .findByCourseIdAndStatus(lesson.getSection().getCourse().getId(), EnrollmentStatus.ACTIVE);

        for (Enrollment enrollment : enrollments) {
            User user = enrollment.getUser();
            if (!hasValidEmail(user)) {
                continue;
            }

            UserNotificationSetting setting = notificationSettingRepository.findByUserId(user.getId()).orElse(null);
            if (setting != null && !Boolean.TRUE.equals(setting.getNewLessonEmail())) {
                continue;
            }

            String subject = "[LMS] Có bài học mới trong khóa " + lesson.getSection().getCourse().getTitle();
            String content = """
                    Xin chào %s,

                    Khóa học "%s" vừa có bài học mới: "%s".

                    Bạn có thể vào học tại:
                    %s/courses/%s

                    Trân trọng,
                    Hệ thống quản lý học tập
                    """.formatted(
                    safeName(user),
                    lesson.getSection().getCourse().getTitle(),
                    lesson.getTitle(),
                    frontendBaseUrl,
                    lesson.getSection().getCourse().getId());

            sendEmail(user.getEmail(), subject, content);
        }
    }

    public void sendNewAssignmentPublished(Assignment assignment) {
        if (assignment == null || assignment.getCourse() == null || !canNotifyForCourse(assignment.getCourse())) {
            return;
        }

        List<Enrollment> enrollments =
                enrollmentRepository.findByCourseIdAndStatus(assignment.getCourse().getId(), EnrollmentStatus.ACTIVE);

        for (Enrollment enrollment : enrollments) {
            User user = enrollment.getUser();
            if (!hasValidEmail(user)) {
                continue;
            }

            UserNotificationSetting setting = notificationSettingRepository.findByUserId(user.getId()).orElse(null);
            if (setting != null && !Boolean.TRUE.equals(setting.getNewAssignmentEmail())) {
                continue;
            }

            String dueText = assignment.getDueAt() == null
                    ? "Không giới hạn hạn nộp"
                    : "Hạn nộp: " + formatDateTime(assignment.getDueAt());

            String subject = "[LMS] Có bài tập mới trong khóa " + assignment.getCourse().getTitle();
            String content = """
                    Xin chào %s,

                    Bạn vừa được giao bài tập mới: "%s" trong khóa "%s".
                    %s

                    Vào khóa học để xem chi tiết:
                    %s/learning/%s

                    Trân trọng,
                    Hệ thống quản lý học tập
                    """.formatted(
                    safeName(user),
                    assignment.getTitle(),
                    assignment.getCourse().getTitle(),
                    dueText,
                    frontendBaseUrl,
                    assignment.getCourse().getId());

            sendEmail(user.getEmail(), subject, content);
        }
    }

    @Scheduled(cron = "${lms.mail.weekly-progress-cron:0 0 7 * * MON}")
    public void sendWeeklyProgressReports() {
        List<UserNotificationSetting> settings = notificationSettingRepository.findByWeeklyProgressEmailTrue();

        for (UserNotificationSetting setting : settings) {
            User user = setting.getUser();
            if (!hasValidEmail(user)) {
                continue;
            }

            List<Enrollment> enrollments = enrollmentRepository.findByUserId(user.getId()).stream()
                    .filter(item -> item.getStatus() == EnrollmentStatus.ACTIVE)
                    .toList();

            if (enrollments.isEmpty()) {
                continue;
            }

            StringBuilder content = new StringBuilder()
                    .append("Xin chào ").append(safeName(user)).append(",\n\n")
                    .append("Đây là báo cáo tiến độ học tập tuần này của bạn:\n\n");

            for (Enrollment enrollment : enrollments) {
                String courseTitle = enrollment.getCourse() != null ? enrollment.getCourse().getTitle() : "Khóa học";
                double progress = enrollment.getProgressPercent() == null ? 0 : enrollment.getProgressPercent();
                String lastAccessText = enrollment.getLastAccessedAt() == null
                        ? "Chưa ghi nhận truy cập gần đây"
                        : "Truy cập gần nhất: " + formatDateTime(enrollment.getLastAccessedAt());

                content.append("- ")
                        .append(courseTitle)
                        .append(": ")
                        .append(String.format("%.0f", progress))
                        .append("% | ")
                        .append(lastAccessText)
                        .append("\n");
            }

            content.append("\nTiếp tục học tại:\n")
                    .append(frontendBaseUrl)
                    .append("/my-courses\n\nTrân trọng,\nHệ thống quản lý học tập");

            sendEmail(user.getEmail(), "[LMS] Báo cáo tiến độ học tập hằng tuần", content.toString());
        }
    }

    private boolean sendEmail(String to, String subject, String text) {
        if (!mailEnabled) {
            log.info("Skip email because lms.mail.enabled=false | to={} | subject={}", to, subject);
            return false;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("Skip email because JavaMailSender is not configured");
            return false;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            mailSender.send(message);
            return true;
        } catch (Exception ex) {
            log.error("Cannot send email to {}", to, ex);
            return false;
        }
    }

    private boolean canNotifyForCourse(Course course) {
        return course != null
                && "PUBLISHED".equalsIgnoreCase(course.getStatus())
                && "PUBLIC".equalsIgnoreCase(course.getVisibility());
    }

    private boolean hasValidEmail(User user) {
        return user != null && user.getEmail() != null && !user.getEmail().isBlank();
    }

    private String safeName(User user) {
        if (user == null) {
            return "bạn";
        }
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }
        if (user.getUsername() != null && !user.getUsername().isBlank()) {
            return user.getUsername();
        }
        return "bạn";
    }

    private String formatDateTime(LocalDateTime value) {
        return value.format(DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy"));
    }
}
