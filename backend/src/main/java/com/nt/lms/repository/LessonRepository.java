package com.nt.lms.repository;

import com.nt.lms.entity.Lesson;
import com.nt.lms.entity.Section;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LessonRepository extends JpaRepository<Lesson, String> {

    List<Lesson> findBySectionOrderByOrderIndexAsc(Section section);

    List<Lesson> findBySectionIdOrderByOrderIndexAsc(String sectionId);

    long countBySection_Course_Id(String courseId);
}