package com.nt.lms.repository;

import com.nt.lms.entity.Section;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SectionRepository extends JpaRepository<Section, String> {
    List<Section> findByCourseIdOrderByOrderIndexAsc(String courseId);
}
