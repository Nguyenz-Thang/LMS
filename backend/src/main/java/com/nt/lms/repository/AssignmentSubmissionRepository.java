package com.nt.lms.repository;

import com.nt.lms.entity.AssignmentSubmission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, String> {

    Optional<AssignmentSubmission> findByAssignmentIdAndStudentId(String assignmentId, String studentId);

    List<AssignmentSubmission> findByAssignmentIdOrderBySubmittedAtDesc(String assignmentId);
}
