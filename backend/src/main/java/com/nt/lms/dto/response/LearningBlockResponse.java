package com.nt.lms.dto.response;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningBlockResponse {
    private String id;
    private String blockType;
    private String title;
    private String content;
    private String mediaUrl;
    private String quizId;
    private String assignmentId;
    private Integer orderIndex;
}
