package com.nt.lms.dto.response;

import lombok.*;

import java.time.LocalDateTime;
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
    private LocalDateTime updatedAt;
    private String content;
    private String videoUrl;
    private String videoTranscript;
    private String videoTranscriptSource;
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
}
