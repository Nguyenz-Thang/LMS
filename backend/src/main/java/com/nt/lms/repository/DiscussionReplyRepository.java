package com.nt.lms.repository;

import com.nt.lms.entity.DiscussionReply;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiscussionReplyRepository extends JpaRepository<DiscussionReply, String> {
    List<DiscussionReply> findByTopicIdOrderByCreatedAtAsc(String topicId);

    long countByTopicId(String topicId);

    void deleteByTopicId(String topicId);
}
