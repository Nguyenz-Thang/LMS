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
public class Enrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @ManyToOne
    User user;

    @ManyToOne
    Course course;
}