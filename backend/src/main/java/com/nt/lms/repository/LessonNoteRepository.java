package com.nt.lms.repository;

import com.nt.lms.entity.LessonNote;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LessonNoteRepository extends JpaRepository<LessonNote, String> {
	List<LessonNote> findByUserIdAndLessonIdOrderByCreatedAtDesc(String userId, String lessonId);

	Optional<LessonNote> findByIdAndUserId(String id, String userId);
}
