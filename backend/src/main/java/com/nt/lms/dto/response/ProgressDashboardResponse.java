package com.nt.lms.dto.response;

import java.util.List;
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
public class ProgressDashboardResponse {
	ProgressSummaryResponse summary;
	List<ProgressTimelinePointResponse> dailyCompletions;
	List<ProgressTimelinePointResponse> weeklyCompletions;
	List<ProgressQuizInsightResponse> independentQuizzes;
	List<ProgressPausedLessonResponse> pausedLessons;
	List<ProgressRiskCourseResponse> atRiskCourses;
	List<Integer> activityYears;
	Integer selectedYear;
}
