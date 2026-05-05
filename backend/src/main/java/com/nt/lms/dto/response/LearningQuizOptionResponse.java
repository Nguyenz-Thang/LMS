package com.nt.lms.dto.response;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningQuizOptionResponse {
    private String id;
    private String optionText;
    private Integer orderIndex;
}