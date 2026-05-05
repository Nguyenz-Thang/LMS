package com.nt.lms.repository;

import com.nt.lms.entity.QuizAttemptAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuizAttemptAnswerRepository extends JpaRepository<QuizAttemptAnswer, String> {

    List<QuizAttemptAnswer> findByAttemptId(String attemptId);

    Optional<QuizAttemptAnswer> findByAttemptIdAndQuestionId(String attemptId, String questionId);
}