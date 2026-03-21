package com.nt.lms.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import com.nt.lms.entity.Course;

public interface CourseRepository extends JpaRepository<Course, String> {
    Page<Course> findByTitleContainingIgnoreCase(String keyword, Pageable pageable);
}