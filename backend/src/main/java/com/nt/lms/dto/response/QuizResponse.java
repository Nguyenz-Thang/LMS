package com.nt.lms.dto.response;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizResponse {

    String id;
    String title;
    String description;
    String courseId;
    String lessonId;
    Integer maxAttempts;
    Integer timeLimitMinutes;
    Integer passingScore;
    Boolean isPublished;
    Long attemptCount;
    List<Question> questions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Question {
        String id;
        String content;
        String explanation;
        String questionType;
        Integer orderIndex;
        List<Option> options;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Option {
        String id;
        String content;
        Boolean isCorrect;
        Integer orderIndex;
    }
}
