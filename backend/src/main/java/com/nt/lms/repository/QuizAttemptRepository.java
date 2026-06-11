package com.nt.lms.repository;

import com.nt.lms.entity.QuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, String> {

    @Query(value = """
            select *
            from quiz_attempts
            where quiz_id = :quizId
              and user_id = :userId
            order by attempt_no desc
            """, nativeQuery = true)
    List<QuizAttempt> findByQuizIdAndUserIdOrderByAttemptNoDesc(
            @Param("quizId") String quizId,
            @Param("userId") String userId);

    @Query(value = """
            select *
            from quiz_attempts
            where quiz_id = :quizId
              and user_id = :userId
            order by attempt_no desc
            limit 1
            """, nativeQuery = true)
    Optional<QuizAttempt> findTopByQuizIdAndUserIdOrderByAttemptNoDesc(
            @Param("quizId") String quizId,
            @Param("userId") String userId);

    @Query(value = """
            select count(*)
            from quiz_attempts
            where quiz_id = :quizId
              and user_id = :userId
            """, nativeQuery = true)
    long countByQuizIdAndUserId(@Param("quizId") String quizId, @Param("userId") String userId);

    @Query("""
            select case when count(attempt) > 0 then true else false end
            from QuizAttempt attempt
            where attempt.user.id = :userId
            """)
    boolean existsByUserId(@Param("userId") String userId);

    @Query(value = """
            select count(*)
            from quiz_attempts
            where quiz_id = :quizId
            """, nativeQuery = true)
    long countByQuizId(@Param("quizId") String quizId);

    @Query("""
            select case when count(attempt) > 0 then true else false end
            from QuizAttempt attempt
            where attempt.quiz.id = :quizId
            """)
    boolean existsByQuizId(@Param("quizId") String quizId);

    @Query(value = """
            select *
            from quiz_attempts
            where quiz_id = :quizId
            order by submitted_at desc, started_at desc
            """, nativeQuery = true)
    List<QuizAttempt> findByQuizIdOrderBySubmittedAtDescStartedAtDesc(@Param("quizId") String quizId);

    @Query(value = """
            select *
            from quiz_attempts
            where user_id = :userId
            order by started_at desc
            """, nativeQuery = true)
    List<QuizAttempt> findByUserIdOrderByStartedAtDesc(@Param("userId") String userId);

    @Query(value = """
            select qa.*
            from quiz_attempts qa
            join quizzes q on q.id = qa.quiz_id
            where qa.user_id = :userId
              and q.course_id is null
              and q.lesson_id is null
            order by qa.submitted_at desc, qa.started_at desc
            """, nativeQuery = true)
    List<QuizAttempt> findByUserIdAndQuizCourseIsNullAndQuizLessonIsNullOrderBySubmittedAtDescStartedAtDesc(
            @Param("userId") String userId);
}
