package com.nt.lms.dto.request;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonProgressRequest {
    private Integer watchedSeconds;
    private Integer lastPositionSec;
    private Boolean completed;
}