package com.nt.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "assignments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Assignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @ManyToOne
    @JoinColumn(name = "course_id", nullable = false)
    Course course;

    @ManyToOne
    @JoinColumn(name = "lesson_id")
    Lesson lesson;

    String title;

    @Column(columnDefinition = "TEXT")
    String description;

    @Column(name = "assignment_type")
    String assignmentType;

    @Column(name = "max_score")
    BigDecimal maxScore;

    @Column(name = "due_at")
    LocalDateTime dueAt;

    @Column(name = "allow_late_submit")
    Boolean allowLateSubmit;

    @ManyToOne
    @JoinColumn(name = "created_by", nullable = false)
    User createdBy;
}