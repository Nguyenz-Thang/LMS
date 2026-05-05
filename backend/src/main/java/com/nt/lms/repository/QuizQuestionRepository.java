package com.nt.lms.repository;

import com.nt.lms.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuizQuestionRepository extends JpaRepository<Question, String> {

    List<Question> findByQuizIdOrderByOrderIndexAsc(String quizId);
}