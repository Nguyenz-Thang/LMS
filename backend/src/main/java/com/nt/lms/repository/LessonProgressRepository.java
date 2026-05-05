package com.nt.lms.repository;

import com.nt.lms.entity.LessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, String> {

    boolean existsByUserIdAndLessonId(String userId, String lessonId);

    long countByUserIdAndLesson_Section_Course_IdAndCompletedTrue(String userId, String courseId);

    Optional<LessonProgress> findByUserIdAndLessonId(String userId, String lessonId);

    List<LessonProgress> findByUserIdAndLessonIdIn(String userId, Collection<String> lessonIds);

    List<LessonProgress> findByUserId(String userId);
}
