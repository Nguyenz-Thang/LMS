package com.nt.lms.repository;

import com.nt.lms.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, String> {
    List<Question> findByQuizId(String quizId);
}