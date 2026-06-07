package com.nt.lms.dto.response;

import com.nt.lms.enums.LessonType;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LessonResponse {
    String id;
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
    String quizId;
    String assignmentId;
}
