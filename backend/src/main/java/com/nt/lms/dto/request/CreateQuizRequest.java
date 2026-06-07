package com.nt.lms.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateQuizRequest {

    private String title;
    private String description;
    private String courseId;
    private String lessonId;
    private Integer maxAttempts;
    private Integer timeLimitMinutes;
    private List<QuestionRequest> questions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionRequest {
        private String content;
        private String explanation;
        private String questionType;
        private Integer orderIndex;
        private List<AnswerRequest> answers;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnswerRequest {
        private String content;
        @JsonProperty("isCorrect")
        private boolean isCorrect;
    }
}
