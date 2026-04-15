package com.nt.lms.repository;

import com.nt.lms.entity.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuizRepository extends JpaRepository<Quiz, String> {

    Optional<Quiz> findByLessonId(String lessonId);

    List<Quiz> findAllByOrderByIdDesc();
}