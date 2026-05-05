package com.nt.lms.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningLessonDetailResponse {
    private String lessonId;
    private String sectionId;
    private String courseId;

    private String title;
    private String description;
    private String content;
    private String videoUrl;
    private String thumbnailUrl;

    private String lessonType;
    private Integer durationMinutes;
    private Integer orderIndex;

    private Boolean preview;
    private Boolean completed;
    private Boolean locked;
    private Integer lastPositionSec;

    private String prevLessonId;
    private String nextLessonId;

    private List<LearningBlockResponse> blocks;
    private List<LearningLessonResourceResponse> resources;
    private List<LearningLessonNoteResponse> notes;
    private Boolean bookmarked;
}
