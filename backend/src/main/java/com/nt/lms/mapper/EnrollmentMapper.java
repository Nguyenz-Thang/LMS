package com.nt.lms.mapper;

import com.nt.lms.dto.response.EnrollmentResponse;
import com.nt.lms.entity.Enrollment;
import org.springframework.stereotype.Component;

@Component
public class EnrollmentMapper {

    public EnrollmentResponse toEnrollmentResponse(Enrollment enrollment) {
        if (enrollment == null) {
            return null;
        }

        return EnrollmentResponse.builder()
                .id(enrollment.getId())
                .userId(enrollment.getUser() != null ? enrollment.getUser().getId() : null)
                .username(enrollment.getUser() != null ? enrollment.getUser().getUsername() : null)
                .courseId(enrollment.getCourse() != null ? enrollment.getCourse().getId() : null)
                .courseTitle(enrollment.getCourse() != null ? enrollment.getCourse().getTitle() : null)
                .status(enrollment.getStatus() != null ? enrollment.getStatus().name() : null)
                .progressPercent(enrollment.getProgressPercent())
                .enrolledAt(enrollment.getEnrolledAt())
                .lastAccessedAt(enrollment.getLastAccessedAt())
                .build();
    }
}