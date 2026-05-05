package com.nt.lms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningQuizQuestionResponse {
    private String id;
    private String questionText;
    private String questionType;
    private String explanation;
    private Integer orderIndex;
    private String selectedOptionId;
    private List<String> selectedOptionIds;
    private String correctOptionId;
    private String correctOptionText;
    private List<String> correctOptionIds;
    private List<String> correctOptionTexts;
    private Boolean correct;
    private List<LearningQuizOptionResponse> options;
}
