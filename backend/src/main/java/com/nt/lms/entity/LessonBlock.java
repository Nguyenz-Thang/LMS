package com.nt.lms.entity;

import com.nt.lms.enums.LessonBlockType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Entity
@Table(name = "lesson_blocks")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LessonBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @ManyToOne
    @JoinColumn(name = "lesson_id", nullable = false)
    Lesson lesson;

    @Enumerated(EnumType.STRING)
    @Column(name = "block_type", nullable = false)
    LessonBlockType blockType;

    @Column(name = "title")
    String title;

    @Lob
    @Column(name = "content")
    String content;

    @Column(name = "media_url")
    String mediaUrl;

    @ManyToOne
    @JoinColumn(name = "quiz_id")
    Quiz quiz;

    @Column(name = "order_index")
    Integer orderIndex;

    @Column(name = "created_at")
    LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (orderIndex == null) {
            orderIndex = 0;
        }
    }
}