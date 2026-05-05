package com.nt.lms.repository;

import com.nt.lms.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AssignmentRepository extends JpaRepository<Assignment, String> {
    Optional<Assignment> findByLessonId(String lessonId);
    Optional<Assignment> findFirstByLessonId(String lessonId);
}