package com.nt.lms.repository;

import com.nt.lms.entity.DiscussionTopic;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiscussionTopicRepository extends JpaRepository<DiscussionTopic, String> {
    Optional<DiscussionTopic> findFirstByLessonIdAndTitleOrderByCreatedAtAsc(String lessonId, String title);

    boolean existsByCreatedById(String createdById);
}
