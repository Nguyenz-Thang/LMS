package com.nt.lms.dto.response;

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
    String content;
    String videoUrl;
    Integer duration;
    String type;
    Boolean isPreview;
    int orderIndex;
}