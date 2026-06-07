package com.nt.lms.entity;

import com.nt.lms.enums.EnrollmentStatus;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Table(name = "enrollments")
public class Enrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    Course course;

    @Column(name = "enrolled_at")
    LocalDateTime enrolledAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    EnrollmentStatus status;

    @Column(name = "progress_percent")
    Double progressPercent;

    @Column(name = "last_accessed_at")
    LocalDateTime lastAccessedAt;
}
