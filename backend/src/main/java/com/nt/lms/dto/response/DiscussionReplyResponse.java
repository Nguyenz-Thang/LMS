package com.nt.lms.dto.response;

import java.time.LocalDateTime;
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
public class DiscussionReplyResponse {
    String id;
    String topicId;
    String parentReplyId;
    String content;
    DiscussionAuthorResponse author;
    Boolean canEdit;
    Boolean canDelete;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
