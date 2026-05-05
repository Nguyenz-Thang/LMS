package com.nt.lms.repository;

import com.nt.lms.entity.LessonBlock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LessonBlockRepository extends JpaRepository<LessonBlock, String> {

    List<LessonBlock> findByLessonIdOrderByOrderIndexAsc(String lessonId);
}