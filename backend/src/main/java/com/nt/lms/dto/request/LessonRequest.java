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
    String content;
    String videoUrl;
    Integer duration;
    String lessonType;
    String type;
    Boolean isPreview;
    Integer orderIndex;
    String sectionId;
}