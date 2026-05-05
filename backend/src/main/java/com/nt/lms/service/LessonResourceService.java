package com.nt.lms.service;

import com.nt.lms.dto.request.LessonResourceRequest;
import com.nt.lms.dto.response.LessonResourceResponse;
import com.nt.lms.entity.Lesson;
import com.nt.lms.entity.LessonResource;
import com.nt.lms.repository.LessonRepository;
import com.nt.lms.repository.LessonResourceRepository;
import java.util.List;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LessonResourceService {

	LessonRepository lessonRepository;
	LessonResourceRepository lessonResourceRepository;

	public LessonResourceResponse create(String lessonId, LessonResourceRequest request) {
		Lesson lesson = getLessonOrThrow(lessonId);
		validateRequest(request);

		LessonResource resource = LessonResource.builder()
				.lesson(lesson)
				.fileName(request.getFileName().trim())
				.fileUrl(request.getFileUrl().trim())
				.fileType(trimToNull(request.getFileType()))
				.fileSize(request.getFileSize() == null ? 0L : Math.max(request.getFileSize(), 0L))
				.build();

		return toResponse(lessonResourceRepository.save(resource));
	}

	public List<LessonResourceResponse> getByLesson(String lessonId) {
		getLessonOrThrow(lessonId);
		return lessonResourceRepository.findByLessonIdOrderByCreatedAtAsc(lessonId)
				.stream()
				.map(this::toResponse)
				.toList();
	}

	public LessonResourceResponse update(String lessonId, String resourceId, LessonResourceRequest request) {
		getLessonOrThrow(lessonId);
		validateRequest(request);

		LessonResource resource = lessonResourceRepository.findById(resourceId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài liệu"));

		if (!resource.getLesson().getId().equals(lessonId)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tài liệu không thuộc bài học này");
		}

		resource.setFileName(request.getFileName().trim());
		resource.setFileUrl(request.getFileUrl().trim());
		resource.setFileType(trimToNull(request.getFileType()));
		resource.setFileSize(request.getFileSize() == null ? 0L : Math.max(request.getFileSize(), 0L));

		return toResponse(lessonResourceRepository.save(resource));
	}

	public void delete(String lessonId, String resourceId) {
		getLessonOrThrow(lessonId);

		LessonResource resource = lessonResourceRepository.findById(resourceId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài liệu"));

		if (!resource.getLesson().getId().equals(lessonId)) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tài liệu không thuộc bài học này");
		}

		lessonResourceRepository.delete(resource);
	}

	private Lesson getLessonOrThrow(String lessonId) {
		return lessonRepository.findById(lessonId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bài học"));
	}

	private void validateRequest(LessonResourceRequest request) {
		if (request == null
				|| request.getFileName() == null
				|| request.getFileName().isBlank()
				|| request.getFileUrl() == null
				|| request.getFileUrl().isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu thông tin tài liệu");
		}
	}

	private LessonResourceResponse toResponse(LessonResource resource) {
		return LessonResourceResponse.builder()
				.id(resource.getId())
				.lessonId(resource.getLesson().getId())
				.fileName(resource.getFileName())
				.fileUrl(resource.getFileUrl())
				.fileType(resource.getFileType())
				.fileSize(resource.getFileSize())
				.createdAt(resource.getCreatedAt())
				.build();
	}

	private String trimToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}
}
