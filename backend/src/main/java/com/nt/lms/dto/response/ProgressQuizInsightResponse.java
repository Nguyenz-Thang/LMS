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
public class ProgressQuizInsightResponse {
	String quizId;
	String title;
	String quizScope;
	Integer attemptCount;
	Double bestScorePercent;
	Double lastScorePercent;
	LocalDateTime lastSubmittedAt;
}
