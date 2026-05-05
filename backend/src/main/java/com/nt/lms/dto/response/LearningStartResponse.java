package com.nt.lms.dto.response;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningStartResponse {
    private String enrollmentId;
    private String courseId;
    private String firstLessonId;
    private String learningUrl;
}