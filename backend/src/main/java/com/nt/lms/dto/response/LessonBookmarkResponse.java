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
public class LessonBookmarkResponse {
	private String bookmarkId;
	private String lessonId;
	private Boolean bookmarked;
	private LocalDateTime createdAt;
}
