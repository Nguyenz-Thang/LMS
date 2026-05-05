package com.nt.lms.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningCourseResponse {
    private String courseId;
    private String title;
    private String description;
    private String thumbnailUrl;
    private String instructorName;
    private String categoryName;
    private String level;

    private Boolean enrolled;
    private String enrollmentId;
    private Double progressPercent;

    private Integer totalSections;
    private Integer totalLessons;
    private Integer totalDurationMinutes;

    private String currentLessonId;
    private String nextLessonId;

    private List<LearningSectionItemResponse> sections;
}