package com.nt.lms.repository;

import com.nt.lms.entity.LessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, String> {

    boolean existsByUserIdAndLessonId(String userId, String lessonId);

    long countByUserIdAndLessonCourseIdAndCompletedTrue(String userId, String courseId);

    long countByLessonCourseId(String courseId);
}