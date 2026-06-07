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
public class AiQuizDraftResponse {
	String title;
	String description;
	String courseId;
	String lessonId;
	List<QuestionDraft> questions;
	String model;

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	@FieldDefaults(level = AccessLevel.PRIVATE)
	public static class QuestionDraft {
		String content;
		String explanation;
		String questionType;
		Integer orderIndex;
		List<AnswerDraft> answers;
	}

	@Data
	@Builder
	@NoArgsConstructor
	@AllArgsConstructor
	@FieldDefaults(level = AccessLevel.PRIVATE)
	public static class AnswerDraft {
		String content;
		Boolean isCorrect;
	}
}
