package com.nt.lms.repository;

import com.nt.lms.entity.DiscussionTopic;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface DiscussionTopicRepository
        extends JpaRepository<DiscussionTopic, String>, JpaSpecificationExecutor<DiscussionTopic> {
    Optional<DiscussionTopic> findFirstByLessonIdAndTitleOrderByCreatedAtAsc(String lessonId, String title);
}
