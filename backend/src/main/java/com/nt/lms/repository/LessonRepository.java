package com.nt.lms.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.nt.lms.entity.Lesson;

public interface LessonRepository extends JpaRepository<Lesson, String> {
    List<Lesson> findByCourseIdOrderByOrderIndexAsc(String courseId);
    long countByCourseId(String courseId);
}