package com.nt.lms.repository;

import com.nt.lms.entity.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface QuizRepository extends JpaRepository<Quiz, String> {

    Optional<Quiz> findByLessonId(String lessonId);
    Optional<Quiz> findFirstByLessonId(String lessonId);

    List<Quiz> findAllByOrderByIdDesc();
    List<Quiz> findByCourseIsNullAndLessonIsNullOrderByIdDesc();
    List<Quiz> findByCourseIsNullAndLessonIsNullAndIsPublishedTrueOrderByIdDesc();

    @Query(value = """
            select id, lesson_id as lessonId
            from quizzes
            where lesson_id in (:lessonIds)
            """, nativeQuery = true)
    List<LessonQuizRef> findLessonQuizRefs(@Param("lessonIds") List<String> lessonIds);

    interface LessonQuizRef {
        String getId();
        String getLessonId();
    }
}
