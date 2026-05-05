package com.nt.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Entity
@Table(name = "lesson_progress")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LessonProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    User user;

    @ManyToOne
    @JoinColumn(name = "lesson_id")
    Lesson lesson;

    @Column(name = "is_completed")
    Boolean completed;

    @Column(name = "watched_seconds")
    Integer watchedSeconds;

    @Column(name = "last_position_sec")
    Integer lastPositionSec;

    @Column(name = "completed_at")
    LocalDateTime completedAt;

    @Column(name = "last_accessed_at")
    LocalDateTime lastAccessedAt;

    @Column(name = "created_at")
    LocalDateTime createdAt;

    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (completed == null) {
            completed = false;
        }
        if (watchedSeconds == null) {
            watchedSeconds = 0;
        }
        if (lastPositionSec == null) {
            lastPositionSec = 0;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}