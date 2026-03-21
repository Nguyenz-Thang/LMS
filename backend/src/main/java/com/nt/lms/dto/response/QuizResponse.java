package com.nt.lms.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class QuizResponse {

    String id;
    String title;
    List<Question> questions;

    @Data
    @Builder
    public static class Question {
        String id;
        String content;
        List<Answer> answers;
    }

    @Data
    @Builder
    public static class Answer {
        String id;
        String content;
    }
}