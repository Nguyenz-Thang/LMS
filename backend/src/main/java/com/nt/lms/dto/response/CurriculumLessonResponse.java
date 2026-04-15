package com.nt.lms.dto.response;

import com.nt.lms.enums.LessonType;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CurriculumLessonResponse {
    String id;
    String title;
    String description;
    String content;
    String videoUrl;
    String thumbnailUrl;
    Integer durationMinutes;
    Boolean isPreview;
    Boolean isPublished;
    int orderIndex;

    LessonType lessonType;
    String quizId;
    String assignmentId;
}