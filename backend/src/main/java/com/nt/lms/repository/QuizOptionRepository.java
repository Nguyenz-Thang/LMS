package com.nt.lms.repository;

import com.nt.lms.entity.QuizOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuizOptionRepository extends JpaRepository<QuizOption, String> {

    List<QuizOption> findByQuestionIdOrderByOrderIndexAsc(String questionId);

    void deleteByQuestionId(String questionId);
}