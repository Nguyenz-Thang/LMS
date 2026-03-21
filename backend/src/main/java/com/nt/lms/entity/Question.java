package com.nt.lms.entity;
import com.nt.lms.enums.QuestionType;
import jakarta.persistence.*;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.Set;


@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    String content;

    @ManyToOne
    Quiz quiz;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL)
    Set<Answer> answers;
}