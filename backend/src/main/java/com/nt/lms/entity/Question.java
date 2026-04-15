package com.nt.lms.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "quiz_questions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    // ================= RELATION =================
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "quiz_id", nullable = false)
    Quiz quiz;

    // ================= FIELDS =================
    @Column(name = "question_text", columnDefinition = "TEXT", nullable = false)
    String content;

    @Column(name = "question_type")
    String questionType; // VD: MULTIPLE_CHOICE

    @Column(name = "explanation", columnDefinition = "TEXT")
    String explanation;

    @Column(name = "points")
    Integer points;

    @Column(name = "order_index")
    Integer orderIndex;

    @Column(name = "created_source")
    String createdSource;

    @Column(name = "created_at")
    LocalDateTime createdAt;

    // ================= RELATION =================
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    Set<QuizOption> options = new LinkedHashSet<>();
}