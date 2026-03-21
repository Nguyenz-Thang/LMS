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
public class Answer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(columnDefinition = "TEXT")
    String content;

    boolean isCorrect;

    @ManyToOne
    Question question;
}