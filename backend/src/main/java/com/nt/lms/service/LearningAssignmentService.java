package com.nt.lms.service;

import com.nt.lms.dto.request.AssignmentSubmissionRequest;
import com.nt.lms.dto.response.LearningAssignmentResponse;
import com.nt.lms.dto.response.LearningSubmissionFileResponse;
import com.nt.lms.entity.Assignment;
import com.nt.lms.entity.AssignmentSubmission;
import com.nt.lms.entity.Enrollment;
import com.nt.lms.entity.SubmissionFile;
import com.nt.lms.entity.User;
import com.nt.lms.enums.EnrollmentStatus;
import com.nt.lms.repository.AssignmentRepository;
import com.nt.lms.repository.AssignmentSubmissionRepository;
import com.nt.lms.repository.EnrollmentRepository;
import com.nt.lms.repository.LessonProgressRepository;
import com.nt.lms.repository.LessonRepository;
import com.nt.lms.repository.SubmissionFileRepository;
import com.nt.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LearningAssignmentService {

    private final UserRepository userRepository;
    private final AssignmentRepository assignmentRepository;
    private final AssignmentSubmissionRepository assignmentSubmissionRepository;
    private final SubmissionFileRepository submissionFileRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonProgressRepository lessonProgressRepository;
    private final LessonRepository lessonRepository;

    public LearningAssignmentResponse getAssignmentDetail(String assignmentId) {
        User currentUser = getCurrentUser();
        Assignment assignment = getAssignmentOrThrow(assignmentId);

        validateAssignmentAccess(currentUser, assignment);

        AssignmentSubmission submission = assignmentSubmissionRepository
                .findByAssignmentIdAndStudentId(assignmentId, currentUser.getId())
                .orElse(null);

        return mapResponse(assignment, submission);
    }

    public LearningAssignmentResponse saveSubmission(String assignmentId, AssignmentSubmissionRequest request) {
        User currentUser = getCurrentUser();
        Assignment assignment = getAssignmentOrThrow(assignmentId);

        validateAssignmentAccess(currentUser, assignment);

        AssignmentSubmission submission = assignmentSubmissionRepository
                .findByAssignmentIdAndStudentId(assignmentId, currentUser.getId())
                .orElseGet(() -> AssignmentSubmission.builder()
                        .assignment(assignment)
                        .student(currentUser)
                        .status("DRAFT")
                        .submissionText("")
                        .build());

        ensureEditable(submission);

        submission.setSubmissionText(request.getSubmissionText());

        if (Boolean.TRUE.equals(request.getSubmitNow())) {
            LocalDateTime now = LocalDateTime.now();
            boolean late = assignment.getDueAt() != null && now.isAfter(assignment.getDueAt());

            if (late && !Boolean.TRUE.equals(assignment.getAllowLateSubmit())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đã quá hạn nộp bài");
            }

            submission.setSubmittedAt(now);
            submission.setStatus(late ? "LATE" : "SUBMITTED");
        } else if (submission.getStatus() == null || submission.getStatus().isBlank()) {
            submission.setStatus("DRAFT");
        }

        AssignmentSubmission saved = assignmentSubmissionRepository.save(submission);

        if (Boolean.TRUE.equals(request.getSubmitNow()) && assignment.getLesson() != null) {
            markLessonCompleted(currentUser, assignment.getLesson());
        }

        return mapResponse(assignment, saved);
    }

    public LearningAssignmentResponse uploadSubmissionFiles(String assignmentId, MultipartFile[] files) {
        User currentUser = getCurrentUser();
        Assignment assignment = getAssignmentOrThrow(assignmentId);

        validateAssignmentAccess(currentUser, assignment);

        if (files == null || files.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bạn chưa chọn file");
        }

        AssignmentSubmission submission = assignmentSubmissionRepository
                .findByAssignmentIdAndStudentId(assignmentId, currentUser.getId())
                .orElseGet(() -> assignmentSubmissionRepository.save(
                        AssignmentSubmission.builder()
                                .assignment(assignment)
                                .student(currentUser)
                                .status("DRAFT")
                                .submissionText("")
                                .build()
                ));

        ensureEditable(submission);

        Path uploadRoot = Paths.get(System.getProperty("user.dir"), "uploads");
        Path uploadDir = uploadRoot.resolve(Paths.get("assignment-submissions", assignmentId, currentUser.getId()));

        try {
            Files.createDirectories(uploadDir);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không tạo được thư mục upload");
        }

        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }

            String originalName = file.getOriginalFilename() == null
                    ? "file"
                    : Paths.get(file.getOriginalFilename()).getFileName().toString();

            String savedName = System.currentTimeMillis()
                    + "_"
                    + UUID.randomUUID()
                    + "_"
                    + originalName.replaceAll("\\s+", "_");

            Path targetPath = uploadDir.resolve(savedName);

            try {
                file.transferTo(targetPath.toFile());
            } catch (Exception e) {
                throw new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "Không upload được file: " + originalName + " | " + e.getMessage()
                );
            }

            SubmissionFile submissionFile = SubmissionFile.builder()
                    .submission(submission)
                    .fileName(originalName)
                    .fileUrl("/uploads/assignment-submissions/" + assignmentId + "/" + currentUser.getId() + "/" + savedName)
                    .fileType(file.getContentType())
                    .fileSize(file.getSize())
                    .build();

            submissionFileRepository.save(submissionFile);
        }

        AssignmentSubmission refreshed = assignmentSubmissionRepository
                .findByAssignmentIdAndStudentId(assignmentId, currentUser.getId())
                .orElse(submission);

        return mapResponse(assignment, refreshed);
    }

    public LearningAssignmentResponse deleteSubmissionFile(String assignmentId, String fileId) {
        User currentUser = getCurrentUser();
        Assignment assignment = getAssignmentOrThrow(assignmentId);

        validateAssignmentAccess(currentUser, assignment);

        AssignmentSubmission submission = assignmentSubmissionRepository
                .findByAssignmentIdAndStudentId(assignmentId, currentUser.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Chưa có bài nộp để xóa file"));

        ensureEditable(submission);

        SubmissionFile file = submissionFileRepository
                .findByIdAndSubmissionId(fileId, submission.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy file"));

        try {
            String relativePath = file.getFileUrl().startsWith("/")
                    ? file.getFileUrl().substring(1)
                    : file.getFileUrl();

            Path realPath = Paths.get(System.getProperty("user.dir")).resolve(relativePath);
            Files.deleteIfExists(realPath);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không xóa được file vật lý");
        }

        submissionFileRepository.delete(file);

        return mapResponse(assignment, submission);
    }

    private LearningAssignmentResponse mapResponse(Assignment assignment, AssignmentSubmission submission) {
        List<LearningSubmissionFileResponse> files = submission == null
                ? Collections.emptyList()
                : submissionFileRepository.findBySubmissionId(submission.getId())
                .stream()
                .map(file -> LearningSubmissionFileResponse.builder()
                        .id(file.getId())
                        .fileName(file.getFileName())
                        .fileUrl(file.getFileUrl())
                        .fileType(file.getFileType())
                        .fileSize(file.getFileSize())
                        .build())
                .toList();

        return LearningAssignmentResponse.builder()
                .assignmentId(assignment.getId())
                .courseId(assignment.getCourse() != null ? assignment.getCourse().getId() : null)
                .lessonId(assignment.getLesson() != null ? assignment.getLesson().getId() : null)
                .title(assignment.getTitle())
                .description(assignment.getDescription())
                .assignmentType(String.valueOf(assignment.getAssignmentType()))
                .maxScore(safeDouble(assignment.getMaxScore()))
                .dueAt(formatDateTime(assignment.getDueAt()))
                .allowLateSubmit(Boolean.TRUE.equals(assignment.getAllowLateSubmit()))
                .submissionId(submission != null ? submission.getId() : null)
                .submissionText(submission != null ? submission.getSubmissionText() : null)
                .submissionStatus(submission != null ? submission.getStatus() : null)
                .submittedAt(submission != null ? formatDateTime(submission.getSubmittedAt()) : null)
                .score(submission != null ? submission.getScore() : null)
                .feedback(submission != null ? submission.getFeedback() : null)
                .files(files)
                .build();
    }

    private void validateAssignmentAccess(User currentUser, Assignment assignment) {
        String courseId = assignment.getCourse() != null ? assignment.getCourse().getId() : null;

        if (courseId != null) {
            Enrollment enrollment = enrollmentRepository
                    .findByUserIdAndCourseId(currentUser.getId(), courseId)
                    .orElse(null);

            if (enrollment == null || enrollment.getStatus() != EnrollmentStatus.ACTIVE) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn chưa đăng ký khóa học để làm bài tập này");
            }
        }
    }

    private void ensureEditable(AssignmentSubmission submission) {
        String status = submission.getStatus() == null ? "" : submission.getStatus().trim().toUpperCase();

        if ("SUBMITTED".equals(status) || "LATE".equals(status) || "GRADED".equals(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bài đã nộp, không thể chỉnh sửa thêm");
        }
    }

    private Assignment getAssignmentOrThrow(String assignmentId) {
        return assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài tập"));
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c ngÆ°á»i dÃ¹ng"));
    }

    private String formatDateTime(LocalDateTime value) {
        if (value == null) return null;
        return value.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
    }

    private double safeDouble(Number value) {
        return value == null ? 0.0 : value.doubleValue();
    }

    private void markLessonCompleted(User currentUser, com.nt.lms.entity.Lesson lesson) {
        var progress = lessonProgressRepository.findByUserIdAndLessonId(currentUser.getId(), lesson.getId())
                .orElseGet(() -> com.nt.lms.entity.LessonProgress.builder()
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
}
