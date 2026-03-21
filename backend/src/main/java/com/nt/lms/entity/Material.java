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
public class Material {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    String fileUrl;
    String fileType;

    @ManyToOne
    Lesson lesson;
}
