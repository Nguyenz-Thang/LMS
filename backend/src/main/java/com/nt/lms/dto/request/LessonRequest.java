package com.nt.lms.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LessonRequest {
    String title;
    String content;
    String videoUrl;
    int orderIndex;
    String courseId;
}