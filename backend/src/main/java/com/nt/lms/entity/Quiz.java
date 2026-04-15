package com.nt.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.util.Set;

@Entity
@Table(name = "quizzes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @ManyToOne
    @JoinColumn(name = "course_id")
    Course course;

    @ManyToOne
    @JoinColumn(name = "lesson_id")
    Lesson lesson;

    String title;

    @Column(columnDefinition = "TEXT")
    String description;

    @Column(name = "quiz_scope")
    String quizScope;

    @Column(name = "passing_score")
    BigDecimal passingScore;

    @Column(name = "time_limit_minutes")
    Integer timeLimitMinutes;

    @Column(name = "max_attempts")
    Integer maxAttempts;

    @Column(name = "is_published", nullable = false)
    @Builder.Default
    Boolean isPublished = false;

    @Column(name = "created_source")
    String createdSource;

    @ManyToOne
    @JoinColumn(name = "created_by")
    User createdBy;
    @OneToMany(mappedBy = "quiz")
    Set<Question> questions;
}