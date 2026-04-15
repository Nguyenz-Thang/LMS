package com.nt.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

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

    String title;

    @Column(columnDefinition = "TEXT")
    String content;

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
    int orderIndex;

    @ManyToOne
    @JoinColumn(name = "section_id")
    Section section;
}