package com.nt.lms.repository;

import com.nt.lms.entity.AssignmentSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AssignmentSubmissionRepository extends JpaRepository<AssignmentSubmission, String> {

    @Query(value = """
            select *
            from assignment_submissions
            where assignment_id = :assignmentId
              and student_id = :studentId
            """, nativeQuery = true)
    Optional<AssignmentSubmission> findByAssignmentIdAndStudentId(
            @Param("assignmentId") String assignmentId,
            @Param("studentId") String studentId);

    boolean existsByStudentIdOrGradedById(String studentId, String gradedById);

    List<AssignmentSubmission> findByAssignmentIdOrderBySubmittedAtDesc(String assignmentId);

    long countByAssignmentIdAndStatusIn(String assignmentId, Collection<String> statuses);

    long countByAssignmentIdAndStatus(String assignmentId, String status);

    @Query("""
            select max(submission.submittedAt)
            from AssignmentSubmission submission
            where submission.assignment.id = :assignmentId
              and submission.status in :statuses
            """)
    LocalDateTime findLatestSubmittedAt(
            @Param("assignmentId") String assignmentId,
            @Param("statuses") Collection<String> statuses);
}
