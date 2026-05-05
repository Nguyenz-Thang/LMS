package com.nt.lms.repository;

import com.nt.lms.entity.Enrollment;
import com.nt.lms.enums.EnrollmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EnrollmentRepository extends JpaRepository<Enrollment, String> {

    boolean existsByUserIdAndCourseId(String userId, String courseId);

    List<Enrollment> findByUserId(String userId);

    List<Enrollment> findByUserIdAndStatus(String userId, EnrollmentStatus status);

    List<Enrollment> findByCourseIdAndStatus(String courseId, EnrollmentStatus status);

    long countByCourseId(String courseId);

    Optional<Enrollment> findByUserIdAndCourseId(String userId, String courseId);
}
