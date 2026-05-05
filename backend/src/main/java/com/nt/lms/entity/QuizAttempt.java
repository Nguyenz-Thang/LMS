package com.nt.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "quiz_attempts",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_quiz_attempt_no", columnNames = {"quiz_id", "user_id", "attempt_no"})
        }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class QuizAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @ManyToOne
    @JoinColumn(name = "quiz_id", nullable = false)
    Quiz quiz;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @Column(name = "attempt_no")
    Integer attemptNo;

    @Column(name = "score")
    Double score;

    @Column(name = "total_score")
    Double totalScore;

    @Column(name = "started_at")
    LocalDateTime startedAt;

    @Column(name = "submitted_at")
    LocalDateTime submittedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    QuizAttemptStatus status;

    @PrePersist
    public void prePersist() {
        if (attemptNo == null) attemptNo = 1;
        if (score == null) score = 0.0;
        if (totalScore == null) totalScore = 0.0;
        if (startedAt == null) startedAt = LocalDateTime.now();
        if (status == null) status = QuizAttemptStatus.IN_PROGRESS;
    }
}