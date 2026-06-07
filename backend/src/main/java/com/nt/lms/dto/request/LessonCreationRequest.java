package com.nt.lms.dto.request;

import com.nt.lms.enums.LessonType;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LessonCreationRequest {
    String title;
    String description;
    String content;
    String videoUrl;
    String thumbnailUrl;
    Integer durationMinutes;
    Boolean isPublished;
    Boolean isPreview;
    Integer orderIndex;
    String sectionId;

    LessonType lessonType;

    String quizTitle;
    String quizDescription;

    String assignmentTitle;
    String assignmentDescription;
    String assignmentType;
}
