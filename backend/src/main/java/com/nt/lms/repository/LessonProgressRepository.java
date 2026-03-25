package com.nt.lms.repository;

import com.nt.lms.entity.LessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, String> {

    boolean existsByUserIdAndLessonId(String userId, String lessonId);

    long countByUserIdAndLesson_Section_Course_IdAndCompletedTrue(String userId, String courseId);
}