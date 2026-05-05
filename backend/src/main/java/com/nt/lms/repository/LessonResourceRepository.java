package com.nt.lms.repository;

import com.nt.lms.entity.LessonResource;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonResourceRepository extends JpaRepository<LessonResource, String> {
	List<LessonResource> findByLessonIdOrderByCreatedAtAsc(String lessonId);
}
