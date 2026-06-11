package com.nt.lms.repository;

import com.nt.lms.entity.LessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface LessonProgressRepository extends JpaRepository<LessonProgress, String> {

    @Query("""
            select case when count(progress) > 0 then true else false end
            from LessonProgress progress
            where progress.user.id = :userId
              and progress.lesson.id = :lessonId
            """)
    boolean existsByUserIdAndLessonId(@Param("userId") String userId, @Param("lessonId") String lessonId);

    @Query("""
            select case when count(progress) > 0 then true else false end
            from LessonProgress progress
            where progress.user.id = :userId
            """)
    boolean existsByUserId(@Param("userId") String userId);

    @Query(value = """
            select count(*)
            from lesson_progress lp
            join lessons l on l.id = lp.lesson_id
            join course_sections s on s.id = l.section_id
            where lp.user_id = :userId
              and s.course_id = :courseId
              and lp.is_completed = true
            """, nativeQuery = true)
    long countByUserIdAndLesson_Section_Course_IdAndCompletedTrue(
            @Param("userId") String userId,
            @Param("courseId") String courseId);

    @Query(value = """
            select *
            from lesson_progress
            where user_id = :userId
              and lesson_id = :lessonId
            """, nativeQuery = true)
    Optional<LessonProgress> findByUserIdAndLessonId(@Param("userId") String userId, @Param("lessonId") String lessonId);

    @Query(value = """
            select *
            from lesson_progress
            where user_id = :userId
              and lesson_id in (:lessonIds)
            """, nativeQuery = true)
    List<LessonProgress> findByUserIdAndLessonIdIn(
            @Param("userId") String userId,
            @Param("lessonIds") Collection<String> lessonIds);

    @Query(value = """
            select *
            from lesson_progress
            where user_id = :userId
            """, nativeQuery = true)
    List<LessonProgress> findByUserId(@Param("userId") String userId);
}
