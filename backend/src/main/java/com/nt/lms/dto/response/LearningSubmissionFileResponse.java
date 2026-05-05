package com.nt.lms.dto.response;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningSubmissionFileResponse {
    private String id;
    private String fileName;
    private String fileUrl;
    private String fileType;
    private Long fileSize;
}