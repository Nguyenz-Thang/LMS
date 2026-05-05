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
public class LearningLessonResourceResponse {
	private String id;
	private String fileName;
	private String fileUrl;
	private String fileType;
	private Long fileSize;
	private LocalDateTime createdAt;
}
