package com.nt.lms.dto.response;

import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProgressRiskCourseResponse {
	String courseId;
	String courseTitle;
	String courseThumbnailUrl;
	Double progressPercent;
	Double expectedProgressPercent;
	Integer totalLessons;
	Integer completedLessons;
	Long daysSinceEnrollment;
	Long daysSinceLastAccess;
	String riskLevel;
	String reason;
	LocalDateTime lastAccessedAt;
}
