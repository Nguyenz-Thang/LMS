package com.nt.lms.repository;

import com.nt.lms.entity.Answer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnswerRepository extends JpaRepository<Answer, String> {}