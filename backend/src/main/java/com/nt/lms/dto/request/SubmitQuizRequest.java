package com.nt.lms.dto.request;

import java.util.Map;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SubmitQuizRequest {

    String quizId;

    // questionId -> answerId
    Map<String, String> answers;
}