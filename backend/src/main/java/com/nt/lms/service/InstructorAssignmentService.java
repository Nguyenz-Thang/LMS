package com.nt.lms.service;

import com.nt.lms.dto.request.GradeAssignmentSubmissionRequest;
import com.nt.lms.dto.response.InstructorAssignmentSubmissionResponse;
import com.nt.lms.dto.response.LearningSubmissionFileResponse;
import com.nt.lms.entity.Assignment;
import com.nt.lms.entity.AssignmentSubmission;
import com.nt.lms.entity.SubmissionFile;
import com.nt.lms.entity.User;
import com.nt.lms.repository.AssignmentRepository;
import com.nt.lms.repository.AssignmentSubmissionRepository;
import com.nt.lms.repository.SubmissionFileRepository;
import com.nt.lms.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class InstructorAssignmentService {
    private final AssignmentRepository assignmentRepository;
    private final AssignmentSubmissionRepository submissionRepository;
    private final SubmissionFileRepository submissionFileRepository;
    private final UserRepository userRepository;

    public List<InstructorAssignmentSubmissionResponse> listSubmissions(String assignmentId) {
        User currentUser = getCurrentUser();
        Assignment assignment = getAssignmentOrThrow(assignmentId);
        ensureCanGrade(currentUser, assignment);

        return submissionRepository.findByAssignmentIdOrderBySubmittedAtDesc(assignmentId).stream()
                .map(this::toResponse)
                .toList();
    }

    public InstructorAssignmentSubmissionResponse gradeSubmission(
            String submissionId,
            GradeAssignmentSubmissionRequest request) {
        User currentUser = getCurrentUser();
        AssignmentSubmission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay bai nop"));

        ensureCanGrade(currentUser, submission.getAssignment());
        validateGradeRequest(submission.getAssignment(), request);

        submission.setScore(request.getScore());
        submission.setFeedback(trimToNull(request.getFeedback()));
        submission.setGradedBy(currentUser);
        submission.setGradedAt(LocalDateTime.now());
        submission.setStatus("GRADED");

        return toResponse(submissionRepository.save(submission));
    }

    private void validateGradeRequest(Assignment assignment, GradeAssignmentSubmissionRequest request) {
        if (request == null || request.getScore() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Diem cham khong duoc de trong");
        }

        double maxScore = assignment.getMaxScore() == null ? 10.0 : assignment.getMaxScore().doubleValue();
        if (request.getScore() < 0 || request.getScore() > maxScore) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Diem phai nam trong khoang 0 den " + maxScore);
        }
    }

    private void ensureCanGrade(User user, Assignment assignment) {
        if (hasRole(user, "ADMIN")) {
            return;
        }

        boolean isInstructor = hasRole(user, "INSTRUCTOR");
        boolean ownsCourse = assignment != null
                && assignment.getCourse() != null
                && assignment.getCourse().getInstructor() != null
                && assignment.getCourse().getInstructor().getId().equals(user.getId());

        if (!isInstructor || !ownsCourse) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ban khong co quyen cham bai tap nay");
        }
    }

    private InstructorAssignmentSubmissionResponse toResponse(AssignmentSubmission submission) {
        Assignment assignment = submission.getAssignment();
        User student = submission.getStudent();

        return InstructorAssignmentSubmissionResponse.builder()
                .id(submission.getId())
                .assignmentId(assignment.getId())
                .assignmentTitle(assignment.getTitle())
                .courseId(assignment.getCourse() != null ? assignment.getCourse().getId() : null)
                .courseTitle(assignment.getCourse() != null ? assignment.getCourse().getTitle() : null)
                .lessonId(assignment.getLesson() != null ? assignment.getLesson().getId() : null)
                .lessonTitle(assignment.getLesson() != null ? assignment.getLesson().getTitle() : null)
                .studentId(student != null ? student.getId() : null)
                .studentName(getUserDisplayName(student))
                .studentUsername(student != null ? student.getUsername() : null)
                .studentEmail(student != null ? student.getEmail() : null)
                .submissionText(submission.getSubmissionText())
                .submittedAt(submission.getSubmittedAt())
                .status(submission.getStatus())
                .score(submission.getScore())
                .maxScore(assignment.getMaxScore() == null ? 10.0 : assignment.getMaxScore().doubleValue())
                .feedback(submission.getFeedback())
                .gradedByName(getUserDisplayName(submission.getGradedBy()))
                .gradedAt(submission.getGradedAt())
                .files(toFileResponses(submission.getId()))
                .build();
    }

    private List<LearningSubmissionFileResponse> toFileResponses(String submissionId) {
        return submissionFileRepository.findBySubmissionId(submissionId).stream()
                .map(this::toFileResponse)
                .toList();
    }

    private LearningSubmissionFileResponse toFileResponse(SubmissionFile file) {
        return LearningSubmissionFileResponse.builder()
                .id(file.getId())
                .fileName(file.getFileName())
                .fileUrl(file.getFileUrl())
                .fileType(file.getFileType())
                .fileSize(file.getFileSize())
                .build();
    }

    private Assignment getAssignmentOrThrow(String assignmentId) {
        return assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay bai tap"));
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Khong xac dinh duoc nguoi dung"));
    }

    private boolean hasRole(User user, String roleName) {
        return user.getRoles() != null && user.getRoles().stream().anyMatch(role -> roleName.equals(role.getName()));
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

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
