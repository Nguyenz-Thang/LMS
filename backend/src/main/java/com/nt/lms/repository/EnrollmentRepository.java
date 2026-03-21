package com.nt.lms.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.nt.lms.entity.Enrollment;

public interface EnrollmentRepository extends JpaRepository<Enrollment, String> {

    boolean existsByUserIdAndCourseId(String userId, String courseId);

    List<Enrollment> findByUserId(String userId);

    Optional<Enrollment> findByUserIdAndCourseId(String userId, String courseId);
}