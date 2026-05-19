package com.nt.lms.dto.response;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningLessonItemResponse {
    private String id;
    private String title;
    private String description;
    private String lessonType;
    private Integer durationMinutes;
    private Integer orderIndex;
    private Boolean preview;
    private Boolean completed;
    private Boolean locked;
    private Integer lastPositionSec;
}
