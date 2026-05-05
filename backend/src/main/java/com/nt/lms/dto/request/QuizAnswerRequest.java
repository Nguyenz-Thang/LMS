package com.nt.lms.dto.request;

import lombok.*;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizAnswerRequest {
    private String questionId;
    private String selectedOptionId;
    private List<String> selectedOptionIds;
    private String answerText;
}
