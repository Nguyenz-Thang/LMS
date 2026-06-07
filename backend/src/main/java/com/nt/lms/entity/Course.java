package com.nt.lms.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Table(name = "courses")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    String title;

    @Column(columnDefinition = "TEXT")
    String description;

    @Column(name = "thumbnail_url")
    String thumbnailUrl;

    String status;
    String visibility;
    String level;

    @Column(name = "estimated_hours")
    Integer estimatedHours;

    @Column(precision = 12, scale = 2)
    BigDecimal price;

    String currency;

    Boolean paid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "instructor_id")
    User instructor;
}
