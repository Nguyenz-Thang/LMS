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
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    String title;
    int timeLimit;

    @ManyToOne
    Course course;
}