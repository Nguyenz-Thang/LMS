package com.nt.lms.dto.response;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningLessonNoteResponse {
	private String id;
	private String noteContent;
	private Integer timeMarkerSec;
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;
}
