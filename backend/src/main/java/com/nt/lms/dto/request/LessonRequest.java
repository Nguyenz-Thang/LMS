package com.nt.lms.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LessonRequest {
    String title;
    String description;
    String content;
    String videoUrl;
    String thumbnailUrl;
    Integer durationMinutes;
    Boolean isPreview;
    Boolean isPublished;
    Integer orderIndex;
    String sectionId;
}