package com.nt.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "assignment_submissions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_assignment_student", columnNames = {"assignment_id", "student_id"})
        }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AssignmentSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assignment_id", nullable = false)
    Assignment assignment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    User student;

    @Lob
    @Column(name = "submission_text")
    String submissionText;

    @Column(name = "submitted_at")
    LocalDateTime submittedAt;

    @Column(name = "status")
    String status;

    @Column(name = "score")
    Double score;

    @Column(name = "feedback", columnDefinition = "TEXT")
    String feedback;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "graded_by")
    User gradedBy;

    @Column(name = "graded_at")
    LocalDateTime gradedAt;

    @PrePersist
    public void prePersist() {
        if (status == null || status.isBlank()) {
            status = "DRAFT";
        }
    }
}