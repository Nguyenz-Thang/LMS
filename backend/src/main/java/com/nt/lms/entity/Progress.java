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
public class Progress {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    double completionPercent;

    @ManyToOne
    User user;

    @ManyToOne
    Course course;
}