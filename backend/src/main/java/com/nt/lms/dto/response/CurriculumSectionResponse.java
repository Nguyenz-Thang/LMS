package com.nt.lms.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CurriculumSectionResponse {
    String id;
    String title;
    String description;
    int orderIndex;
    int totalLessons;
    Integer totalDurationMinutes;
    List<CurriculumLessonResponse> lessons;
}