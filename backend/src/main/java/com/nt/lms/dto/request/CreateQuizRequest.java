package com.nt.lms.dto.request;

import java.util.List;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateQuizRequest {

    String title;
    String courseId;

    List<QuestionRequest> questions;

    @Data
    public static class QuestionRequest {
        String content;
        List<AnswerRequest> answers;
    }

    @Data
    public static class AnswerRequest {
        String content;
        boolean isCorrect;
    }
}