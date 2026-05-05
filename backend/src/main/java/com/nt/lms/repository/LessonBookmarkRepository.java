package com.nt.lms.repository;

import com.nt.lms.entity.LessonBookmark;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonBookmarkRepository extends JpaRepository<LessonBookmark, String> {
	Optional<LessonBookmark> findByUserIdAndLessonId(String userId, String lessonId);
	List<LessonBookmark> findByUserIdAndLessonIdIn(String userId, List<String> lessonIds);

	boolean existsByUserIdAndLessonId(String userId, String lessonId);
}
