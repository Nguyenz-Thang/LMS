package com.nt.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Entity
@Table(name = "lessons")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Lesson {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(name = "title", nullable = false)
    String title;

    @Lob
    @Column(name = "content", columnDefinition = "LONGTEXT")
    String content;

    @Column(name = "description", columnDefinition = "TEXT")
    String description;

    @Column(name = "video_url")
    String videoUrl;

    @Column(name = "thumbnail_url")
    String thumbnailUrl;

    @Column(name = "duration_minutes")
    Integer durationMinutes;

    @Column(name = "is_published")
    Boolean isPublished;

    @Column(name = "is_preview")
    Boolean isPreview;

    @Column(name = "order_index")
    Integer orderIndex;

    @Column(name = "created_at")
    LocalDateTime createdAt;

    @Column(name = "updated_at")
    LocalDateTime updatedAt;

    @ManyToOne
    @JoinColumn(name = "section_id")
    Section section;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (isPublished == null) {
            isPublished = true;
        }
        if (isPreview == null) {
            isPreview = false;
        }
        if (durationMinutes == null) {
            durationMinutes = 0;
        }
        if (orderIndex == null) {
            orderIndex = 0;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}