package com.nt.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
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

    String videoUrl;

    Integer duration;

    @Column(name = "lesson_type")
    String lessonType;

    Boolean isPreview;

    int orderIndex;

    @ManyToOne
    Section section;
}