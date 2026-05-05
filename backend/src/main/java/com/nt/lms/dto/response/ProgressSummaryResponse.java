package com.nt.lms.dto.response;

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
public class ProgressSummaryResponse {
	Long totalLearningSeconds;
	Integer totalCompletedLessons;
	Integer activeCourses;
	Integer completedCourses;
	Integer totalIndependentQuizAttempts;
	Double averageProgressPercent;
}
