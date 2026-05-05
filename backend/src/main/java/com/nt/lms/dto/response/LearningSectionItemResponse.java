package com.nt.lms.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningSectionItemResponse {
    private String id;
    private String title;
    private Integer orderIndex;
    private Integer totalLessons;
    private Integer totalDurationMinutes;
    private List<LearningLessonItemResponse> lessons;
}