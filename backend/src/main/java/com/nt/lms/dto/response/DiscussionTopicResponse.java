package com.nt.lms.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class DiscussionTopicResponse {
    String id;
    String courseId;
    String courseTitle;
    String lessonId;
    String lessonTitle;
    String title;
    String content;
    Boolean pinned;
    Boolean locked;
    Long replyCount;
    DiscussionAuthorResponse author;
    Boolean canEdit;
    Boolean canDelete;
    Boolean canModerate;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
    List<DiscussionReplyResponse> replies;
}
