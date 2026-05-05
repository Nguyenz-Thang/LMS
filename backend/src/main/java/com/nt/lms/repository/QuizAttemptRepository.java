package com.nt.lms.repository;

import com.nt.lms.entity.QuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, String> {

    List<QuizAttempt> findByQuizIdAndUserIdOrderByAttemptNoDesc(String quizId, String userId);

    Optional<QuizAttempt> findTopByQuizIdAndUserIdOrderByAttemptNoDesc(String quizId, String userId);

    long countByQuizIdAndUserId(String quizId, String userId);

    long countByQuizId(String quizId);

    List<QuizAttempt> findByQuizIdOrderBySubmittedAtDescStartedAtDesc(String quizId);

    List<QuizAttempt> findByUserIdOrderByStartedAtDesc(String userId);

    List<QuizAttempt> findByUserIdAndQuizCourseIsNullAndQuizLessonIsNullOrderBySubmittedAtDescStartedAtDesc(String userId);
}
