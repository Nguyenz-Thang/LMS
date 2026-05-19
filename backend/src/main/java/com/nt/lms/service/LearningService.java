package com.nt.lms.service;

import com.nt.lms.dto.request.LessonNoteRequest;
import com.nt.lms.dto.request.LessonProgressRequest;
import com.nt.lms.dto.request.LearningStartRequest;
import com.nt.lms.dto.response.LearningBlockResponse;
import com.nt.lms.dto.response.LearningCourseResponse;
import com.nt.lms.dto.response.LearningLessonDetailResponse;
import com.nt.lms.dto.response.LearningLessonItemResponse;
import com.nt.lms.dto.response.LearningLessonNoteResponse;
import com.nt.lms.dto.response.LearningLessonResourceResponse;
import com.nt.lms.dto.response.LearningSectionItemResponse;
import com.nt.lms.dto.response.LearningStartResponse;
import com.nt.lms.entity.Course;
import com.nt.lms.entity.Enrollment;
import com.nt.lms.entity.LearningActivityLog;
import com.nt.lms.entity.Lesson;
import com.nt.lms.entity.LessonBlock;
import com.nt.lms.entity.LessonNote;
import com.nt.lms.entity.LessonProgress;
import com.nt.lms.entity.LessonResource;
import com.nt.lms.entity.Question;
import com.nt.lms.entity.QuizAttemptAnswer;
import com.nt.lms.entity.Section;
import com.nt.lms.entity.User;
import com.nt.lms.enums.EnrollmentStatus;
import com.nt.lms.enums.LessonBlockType;
import com.nt.lms.repository.AssignmentRepository;
import com.nt.lms.repository.AssignmentSubmissionRepository;
import com.nt.lms.repository.CourseRepository;
import com.nt.lms.repository.EnrollmentRepository;
import com.nt.lms.repository.LearningActivityLogRepository;
import com.nt.lms.repository.LessonBlockRepository;
import com.nt.lms.repository.LessonNoteRepository;
import com.nt.lms.repository.LessonProgressRepository;
import com.nt.lms.repository.LessonRepository;
import com.nt.lms.repository.LessonResourceRepository;
import com.nt.lms.repository.QuestionRepository;
import com.nt.lms.repository.QuizAttemptAnswerRepository;
import com.nt.lms.repository.QuizAttemptRepository;
import com.nt.lms.repository.QuizRepository;
import com.nt.lms.repository.SectionRepository;
import com.nt.lms.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class LearningService {
	private final QuizRepository quizRepository;
	private final AssignmentRepository assignmentRepository;
	private final UserRepository userRepository;
	private final CourseRepository courseRepository;
	private final SectionRepository sectionRepository;
	private final LessonRepository lessonRepository;
	private final EnrollmentRepository enrollmentRepository;
	private final LessonProgressRepository lessonProgressRepository;
	private final LessonBlockRepository lessonBlockRepository;
	private final LessonResourceRepository lessonResourceRepository;
	private final LessonNoteRepository lessonNoteRepository;
	private final LearningActivityLogRepository learningActivityLogRepository;
	private final QuizAttemptRepository quizAttemptRepository;
	private final QuizAttemptAnswerRepository quizAttemptAnswerRepository;
	private final QuestionRepository questionRepository;
	private final AssignmentSubmissionRepository assignmentSubmissionRepository;

	public LearningStartResponse startCourse(String courseId, LearningStartRequest request) {
		User currentUser = getCurrentUser();
		Course course = getCourseOrThrow(courseId);
		ensureCourseAvailableForLearning(course, currentUser);

		Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(currentUser.getId(), courseId)
				.orElseGet(() -> {
					if (requiresPayment(course, currentUser)) {
						throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "Khoa hoc nay can xac nhan thanh toan");
					}

					Enrollment newEnrollment = Enrollment.builder()
							.user(currentUser)
							.course(course)
							.status(EnrollmentStatus.ACTIVE)
							.progressPercent(0.0)
							.enrolledAt(LocalDateTime.now())
							.lastAccessedAt(LocalDateTime.now())
							.build();
					return enrollmentRepository.save(newEnrollment);
				});

		logActivity(currentUser, course, null, "VIEW_COURSE", "start-course");

		List<Section> sections = sectionRepository.findByCourseIdOrderByOrderIndexAsc(courseId);
		String firstLessonId = findFirstLessonId(sections);

		return LearningStartResponse.builder()
				.enrollmentId(enrollment.getId())
				.courseId(courseId)
				.firstLessonId(firstLessonId)
				.learningUrl(firstLessonId == null
						? "/learning/" + courseId
						: "/learning/" + courseId + "/" + firstLessonId)
				.build();
	}

	public LearningCourseResponse getLearningCourse(String courseId) {
		User currentUser = getCurrentUser();
		Course course = getCourseOrThrow(courseId);
		ensureCourseAvailableForLearning(course, currentUser);
		logActivity(currentUser, course, null, "VIEW_COURSE", "open-learning-course");

		Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(currentUser.getId(), courseId)
				.orElse(null);

		boolean enrolled = enrollment != null && enrollment.getStatus() == EnrollmentStatus.ACTIVE;

		List<Section> sections = sectionRepository.findByCourseIdOrderByOrderIndexAsc(courseId);
		List<String> lessonIds = new ArrayList<>();
		Map<String, List<Lesson>> sectionLessonsMap = new LinkedHashMap<>();

		for (Section section : sections) {
			List<Lesson> lessons = lessonRepository.findBySectionIdOrderByOrderIndexAsc(section.getId());
			sectionLessonsMap.put(section.getId(), lessons);
			lessonIds.addAll(lessons.stream().map(Lesson::getId).toList());
		}

		Map<String, LessonProgress> progressMap = lessonIds.isEmpty()
				? new HashMap<>()
				: getLessonProgressMap(currentUser.getId(), lessonIds);
		Map<String, Boolean> sequenceLockedMap = buildSequenceLockedMap(sections, progressMap, enrolled);

		List<LearningSectionItemResponse> sectionResponses = new ArrayList<>();
		int totalLessons = 0;
		int totalDuration = 0;

		for (Section section : sections) {
			List<Lesson> lessons = sectionLessonsMap.getOrDefault(section.getId(), Collections.emptyList());

			List<LearningLessonItemResponse> lessonResponses = new ArrayList<>();
			int sectionDuration = 0;

			for (Lesson lesson : lessons) {
				LessonProgress progress = progressMap.get(lesson.getId());
				boolean completed = progress != null && Boolean.TRUE.equals(progress.getCompleted());
				boolean locked = Boolean.TRUE.equals(sequenceLockedMap.get(lesson.getId()));

				totalLessons++;
				sectionDuration += safeInt(lesson.getDurationMinutes());
				totalDuration += safeInt(lesson.getDurationMinutes());

				lessonResponses.add(LearningLessonItemResponse.builder()
						.id(lesson.getId())
						.title(lesson.getTitle())
						.description(lesson.getDescription())
						.lessonType(inferLessonType(lesson))
						.durationMinutes(safeInt(lesson.getDurationMinutes()))
						.orderIndex(safeInt(lesson.getOrderIndex()))
						.preview(Boolean.TRUE.equals(lesson.getIsPreview()))
						.completed(completed)
						.locked(locked)
						.lastPositionSec(progress != null ? safeInt(progress.getLastPositionSec()) : 0)
						.build());
			}

			sectionResponses.add(LearningSectionItemResponse.builder()
					.id(section.getId())
					.title(section.getTitle())
					.orderIndex(safeInt(section.getOrderIndex()))
					.totalLessons(lessons.size())
					.totalDurationMinutes(sectionDuration)
					.lessons(lessonResponses)
					.build());
		}

		String currentLessonId = findCurrentLessonId(sectionResponses);
		String nextLessonId = findNextLessonId(sectionResponses, currentLessonId);

		return LearningCourseResponse.builder()
				.courseId(course.getId())
				.title(course.getTitle())
				.description(course.getDescription())
				.thumbnailUrl(course.getThumbnailUrl())
				.instructorName(course.getInstructor() != null ? course.getInstructor().getFullName() : null)
				.categoryName(course.getCategory() != null ? course.getCategory().getName() : null)
				.level(course.getLevel() != null ? String.valueOf(course.getLevel()) : null)
				.enrolled(enrolled)
				.enrollmentId(enrollment != null ? enrollment.getId() : null)
				.progressPercent(enrollment != null ? enrollment.getProgressPercent() : 0.0)
				.totalSections(sections.size())
				.totalLessons(totalLessons)
				.totalDurationMinutes(totalDuration)
				.currentLessonId(currentLessonId)
				.nextLessonId(nextLessonId)
				.sections(sectionResponses)
				.build();
	}

	public LearningLessonDetailResponse getLessonDetail(String courseId, String lessonId) {
		User currentUser = getCurrentUser();
		Course course = getCourseOrThrow(courseId);
		ensureCourseAvailableForLearning(course, currentUser);

		Lesson lesson = lessonRepository.findById(lessonId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay bai hoc"));

		if (lesson.getSection() == null
				|| lesson.getSection().getCourse() == null
				|| !course.getId().equals(lesson.getSection().getCourse().getId())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bai hoc khong thuoc khoa hoc nay");
		}

		ensureLessonAccessible(courseId, lesson, currentUser);

		LessonProgress progress = lessonProgressRepository.findByUserIdAndLessonId(currentUser.getId(), lessonId)
				.orElse(null);
		List<LessonResource> resources = lessonResourceRepository.findByLessonIdOrderByCreatedAtAsc(lessonId);
		List<LessonNote> notes = lessonNoteRepository.findByUserIdAndLessonIdOrderByCreatedAtDesc(currentUser.getId(), lessonId);
		List<Section> sections = sectionRepository.findByCourseIdOrderByOrderIndexAsc(courseId);
		List<Lesson> flatLessons = new ArrayList<>();
		for (Section section : sections) {
			flatLessons.addAll(lessonRepository.findBySectionIdOrderByOrderIndexAsc(section.getId()));
		}

		int currentIndex = -1;
		for (int i = 0; i < flatLessons.size(); i++) {
			if (flatLessons.get(i).getId().equals(lessonId)) {
				currentIndex = i;
				break;
			}
		}

		String prevLessonId = currentIndex > 0 ? flatLessons.get(currentIndex - 1).getId() : null;
		String nextLessonId = currentIndex >= 0 && currentIndex < flatLessons.size() - 1
				? flatLessons.get(currentIndex + 1).getId()
				: null;

		List<LearningBlockResponse> blockResponses = new ArrayList<>(
				lessonBlockRepository.findByLessonIdOrderByOrderIndexAsc(lessonId)
						.stream()
						.filter(block -> block.getBlockType() != LessonBlockType.UNKNOWN)
						.map(block -> LearningBlockResponse.builder()
								.id(block.getId())
								.blockType(block.getBlockType())
								.title(block.getTitle())
								.content(block.getContent())
								.mediaUrl(block.getMediaUrl())
								.quizId(block.getQuiz() != null ? block.getQuiz().getId() : null)
								.assignmentId(null)
								.orderIndex(safeInt(block.getOrderIndex()))
								.build())
						.toList());

		quizRepository.findFirstByLessonId(lessonId).ifPresent(quiz -> {
			boolean existsQuizBlock = blockResponses.stream()
					.anyMatch(b -> b.getBlockType() == LessonBlockType.QUIZ);

			if (!existsQuizBlock) {
				blockResponses.add(LearningBlockResponse.builder()
						.id("quiz-" + quiz.getId())
						.blockType(LessonBlockType.QUIZ)
						.title(quiz.getTitle())
						.content(quiz.getDescription())
						.mediaUrl(null)
						.quizId(quiz.getId())
						.assignmentId(null)
						.orderIndex(9998)
						.build());
			}
		});

		assignmentRepository.findFirstByLessonId(lessonId).ifPresent(assignment -> {
			boolean existsAssignmentBlock = blockResponses.stream()
					.anyMatch(b -> b.getBlockType() == LessonBlockType.ASSIGNMENT);

			if (!existsAssignmentBlock) {
				blockResponses.add(LearningBlockResponse.builder()
						.id("assignment-" + assignment.getId())
						.blockType(LessonBlockType.ASSIGNMENT)
						.title(assignment.getTitle())
						.content(assignment.getDescription())
						.mediaUrl(null)
						.quizId(null)
						.assignmentId(assignment.getId())
						.orderIndex(9999)
						.build());
			}
		});

		int fileOrderIndex = 5000;
		for (LessonResource resource : resources) {
			boolean existsFileBlock = blockResponses.stream()
					.anyMatch(block -> block.getBlockType() == LessonBlockType.FILE
							&& Objects.equals(block.getMediaUrl(), resource.getFileUrl()));

			if (!existsFileBlock) {
				blockResponses.add(LearningBlockResponse.builder()
						.id("resource-" + resource.getId())
						.blockType(LessonBlockType.FILE)
						.title(resource.getFileName())
						.content(resource.getFileType())
						.mediaUrl(resource.getFileUrl())
						.quizId(null)
						.assignmentId(null)
						.orderIndex(fileOrderIndex++)
						.build());
			}
		}

		blockResponses.sort(Comparator.comparing(LearningBlockResponse::getOrderIndex));
		logActivity(currentUser, course, lesson, "START_LESSON", lesson.getId());

		return LearningLessonDetailResponse.builder()
				.lessonId(lesson.getId())
				.sectionId(lesson.getSection().getId())
				.courseId(courseId)
				.title(lesson.getTitle())
				.description(lesson.getDescription())
				.updatedAt(lesson.getUpdatedAt())
				.content(lesson.getContent())
				.videoUrl(lesson.getVideoUrl())
				.thumbnailUrl(lesson.getThumbnailUrl())
				.lessonType(inferLessonType(lesson))
				.durationMinutes(safeInt(lesson.getDurationMinutes()))
				.orderIndex(safeInt(lesson.getOrderIndex()))
				.preview(Boolean.TRUE.equals(lesson.getIsPreview()))
				.completed(progress != null && Boolean.TRUE.equals(progress.getCompleted()))
				.locked(false)
				.lastPositionSec(progress != null ? safeInt(progress.getLastPositionSec()) : 0)
				.prevLessonId(prevLessonId)
				.nextLessonId(nextLessonId)
				.blocks(blockResponses)
				.resources(resources.stream().map(this::toLearningResourceResponse).toList())
				.notes(notes.stream().map(this::toLearningNoteResponse).toList())
				.build();
	}

	public void saveLessonProgress(String lessonId, LessonProgressRequest request) {
		User currentUser = getCurrentUser();

		Lesson lesson = lessonRepository.findById(lessonId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay bai hoc"));

		String courseId = lesson.getSection().getCourse().getId();

		Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(currentUser.getId(), courseId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Ban chua dang ky khoa hoc"));

		LessonProgress progress = lessonProgressRepository.findByUserIdAndLessonId(currentUser.getId(), lessonId)
				.orElseGet(() -> LessonProgress.builder()
						.user(currentUser)
						.lesson(lesson)
						.completed(false)
						.watchedSeconds(0)
						.lastPositionSec(0)
						.createdAt(LocalDateTime.now())
						.updatedAt(LocalDateTime.now())
						.build());

		if (request.getWatchedSeconds() != null) {
			progress.setWatchedSeconds(Math.max(safeInt(progress.getWatchedSeconds()), request.getWatchedSeconds()));
		}

		if (request.getLastPositionSec() != null) {
			progress.setLastPositionSec(request.getLastPositionSec());
		}

		if (Boolean.TRUE.equals(request.getCompleted())) {
			if (!canMarkLessonCompleted(currentUser.getId(), lesson)) {
				throw new ResponseStatusException(
						HttpStatus.BAD_REQUEST,
						"Ban can hoan thanh noi dung bat buoc cua bai hoc truoc khi mo bai tiep theo");
			}
			progress.setCompleted(true);
			if (progress.getCompletedAt() == null) {
				progress.setCompletedAt(LocalDateTime.now());
			}
		}

		progress.setLastAccessedAt(LocalDateTime.now());
		progress.setUpdatedAt(LocalDateTime.now());
		lessonProgressRepository.save(progress);

		enrollment.setLastAccessedAt(LocalDateTime.now());
		enrollment.setProgressPercent(recalculateCourseProgress(currentUser.getId(), courseId));
		enrollmentRepository.save(enrollment);

		if (Boolean.TRUE.equals(request.getCompleted())) {
			logActivity(currentUser, enrollment.getCourse(), lesson, "COMPLETE_LESSON", lesson.getId());
		}
	}

	public List<LearningLessonNoteResponse> getLessonNotes(String lessonId) {
		User currentUser = getCurrentUser();
		Lesson lesson = getAccessibleLesson(lessonId, currentUser);

		return lessonNoteRepository.findByUserIdAndLessonIdOrderByCreatedAtDesc(currentUser.getId(), lesson.getId())
				.stream()
				.map(this::toLearningNoteResponse)
				.toList();
	}

	public LearningLessonNoteResponse createLessonNote(String lessonId, LessonNoteRequest request) {
		User currentUser = getCurrentUser();
		Lesson lesson = getAccessibleLesson(lessonId, currentUser);
		validateNoteRequest(request);

		LessonNote note = LessonNote.builder()
				.user(currentUser)
				.lesson(lesson)
				.noteContent(request.getNoteContent().trim())
				.timeMarkerSec(request.getTimeMarkerSec())
				.build();

		note = lessonNoteRepository.save(note);
		logActivity(currentUser, lesson.getSection().getCourse(), lesson, "ADD_NOTE", note.getId());
		return toLearningNoteResponse(note);
	}

	public LearningLessonNoteResponse updateLessonNote(String lessonId, String noteId, LessonNoteRequest request) {
		User currentUser = getCurrentUser();
		Lesson lesson = getAccessibleLesson(lessonId, currentUser);
		validateNoteRequest(request);

		LessonNote note = lessonNoteRepository.findByIdAndUserId(noteId, currentUser.getId())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay ghi chu"));

		if (!note.getLesson().getId().equals(lesson.getId())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ghi chu khong thuoc bai hoc nay");
		}

		note.setNoteContent(request.getNoteContent().trim());
		note.setTimeMarkerSec(request.getTimeMarkerSec());

		return toLearningNoteResponse(lessonNoteRepository.save(note));
	}

	public void deleteLessonNote(String lessonId, String noteId) {
		User currentUser = getCurrentUser();
		Lesson lesson = getAccessibleLesson(lessonId, currentUser);

		LessonNote note = lessonNoteRepository.findByIdAndUserId(noteId, currentUser.getId())
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay ghi chu"));

		if (!note.getLesson().getId().equals(lesson.getId())) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ghi chu khong thuoc bai hoc nay");
		}

		lessonNoteRepository.delete(note);
	}

	private double recalculateCourseProgress(String userId, String courseId) {
		long totalLessons = lessonRepository.countBySection_Course_Id(courseId);
		if (totalLessons <= 0) {
			return 0.0;
		}

		long completedLessons = lessonProgressRepository
				.countByUserIdAndLesson_Section_Course_IdAndCompletedTrue(userId, courseId);

		double percent = (completedLessons * 100.0) / totalLessons;
		return Math.round(percent * 100.0) / 100.0;
	}

	private String findFirstLessonId(List<Section> sections) {
		for (Section section : sections) {
			List<Lesson> lessons = lessonRepository.findBySectionIdOrderByOrderIndexAsc(section.getId());
			if (!lessons.isEmpty()) {
				return lessons.get(0).getId();
			}
		}
		return null;
	}

	private String findCurrentLessonId(List<LearningSectionItemResponse> sections) {
		for (LearningSectionItemResponse section : sections) {
			for (LearningLessonItemResponse lesson : section.getLessons()) {
				if (!Boolean.TRUE.equals(lesson.getLocked()) && !Boolean.TRUE.equals(lesson.getCompleted())) {
					return lesson.getId();
				}
			}
		}

		for (LearningSectionItemResponse section : sections) {
			for (LearningLessonItemResponse lesson : section.getLessons()) {
				if (!Boolean.TRUE.equals(lesson.getLocked())) {
					return lesson.getId();
				}
			}
		}

		return null;
	}

	private String findNextLessonId(List<LearningSectionItemResponse> sections, String currentLessonId) {
		List<LearningLessonItemResponse> flat = new ArrayList<>();
		for (LearningSectionItemResponse section : sections) {
			flat.addAll(section.getLessons());
		}

		for (int i = 0; i < flat.size(); i++) {
			if (Objects.equals(flat.get(i).getId(), currentLessonId)) {
				for (int j = i + 1; j < flat.size(); j++) {
					if (!Boolean.TRUE.equals(flat.get(j).getLocked())) {
						return flat.get(j).getId();
					}
				}
				break;
			}
		}

		return null;
	}

	private String inferLessonType(Lesson lesson) {
		if (lesson.getVideoUrl() != null && !lesson.getVideoUrl().isBlank()) {
			return "VIDEO";
		}

		if (quizRepository.findFirstByLessonId(lesson.getId()).isPresent()) {
			return "QUIZ";
		}

		if (assignmentRepository.findFirstByLessonId(lesson.getId()).isPresent()) {
			return "ASSIGNMENT";
		}

		if (lesson.getContent() != null && !lesson.getContent().isBlank()) {
			return "READING";
		}

		List<LessonBlock> blocks = lessonBlockRepository.findByLessonIdOrderByOrderIndexAsc(lesson.getId());

		boolean hasQuiz = blocks.stream().anyMatch(b -> b.getBlockType() == LessonBlockType.QUIZ);
		boolean hasAssignment = blocks.stream().anyMatch(b -> b.getBlockType() == LessonBlockType.ASSIGNMENT);
		boolean hasVideo = blocks.stream().anyMatch(b -> b.getBlockType() == LessonBlockType.VIDEO);
		boolean hasFile = blocks.stream().anyMatch(b -> b.getBlockType() == LessonBlockType.FILE);

		if (hasQuiz) return "QUIZ";
		if (hasAssignment) return "ASSIGNMENT";
		if (hasVideo) return "VIDEO";
		if (hasFile) return "FILE";

		return "LESSON";
	}

	private void ensureLessonAccessible(String courseId, Lesson lesson, User currentUser) {
		Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(currentUser.getId(), courseId)
				.orElse(null);

		boolean enrolled = enrollment != null && enrollment.getStatus() == EnrollmentStatus.ACTIVE;
		boolean locked = !enrolled && !Boolean.TRUE.equals(lesson.getIsPreview());

		if (locked) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ban chua dang ky khoa hoc");
		}

		if (enrolled && isLockedBySequence(currentUser.getId(), courseId, lesson.getId())) {
			throw new ResponseStatusException(
					HttpStatus.FORBIDDEN,
					"Ban can hoan thanh bai hoc truoc do truoc khi vao bai nay");
		}
	}

	private Lesson getAccessibleLesson(String lessonId, User currentUser) {
		Lesson lesson = lessonRepository.findById(lessonId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay bai hoc"));

		ensureLessonAccessible(lesson.getSection().getCourse().getId(), lesson, currentUser);
		return lesson;
	}

	private void validateNoteRequest(LessonNoteRequest request) {
		if (request == null || request.getNoteContent() == null || request.getNoteContent().isBlank()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Noi dung ghi chu khong duoc de trong");
		}
	}

	private Course getCourseOrThrow(String courseId) {
		return courseRepository.findById(courseId)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Khong tim thay khoa hoc"));
	}

	private void ensureCourseAvailableForLearning(Course course, User currentUser) {
		boolean isAdmin = currentUser.getRoles() != null
				&& currentUser.getRoles().stream().anyMatch(role -> "ADMIN".equals(role.getName()));
		boolean isOwner = course.getInstructor() != null
				&& currentUser != null
				&& course.getInstructor().getId().equals(currentUser.getId());
		boolean publishedAndPublic = "PUBLISHED".equalsIgnoreCase(course.getStatus())
				&& "PUBLIC".equalsIgnoreCase(course.getVisibility());

		if (!isAdmin && !isOwner && !publishedAndPublic) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Khoa hoc dang cho duyet hoac chua duoc cong khai");
		}
	}

	private User getCurrentUser() {
		String username = SecurityContextHolder.getContext().getAuthentication().getName();
		return userRepository.findByUsername(username)
				.orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Khong xac dinh duoc nguoi dung"));
	}

	private int safeInt(Integer value) {
		return value == null ? 0 : value;
	}

	private boolean isLockedBySequence(String userId, String courseId, String lessonId) {
		List<Section> sections = sectionRepository.findByCourseIdOrderByOrderIndexAsc(courseId);
		List<Lesson> orderedLessons = getOrderedLessons(courseId);
		if (orderedLessons.isEmpty()) {
			return false;
		}

		Map<String, LessonProgress> progressMap = getLessonProgressMap(
				userId,
				orderedLessons.stream().map(Lesson::getId).toList());
		Map<String, Boolean> lockedMap = buildSequenceLockedMap(sections, progressMap, true);
		return Boolean.TRUE.equals(lockedMap.get(lessonId));
	}

	private Map<String, LessonProgress> getLessonProgressMap(String userId, List<String> lessonIds) {
		if (lessonIds == null || lessonIds.isEmpty()) {
			return new HashMap<>();
		}

		return lessonProgressRepository.findByUserIdAndLessonIdIn(userId, lessonIds).stream()
				.collect(Collectors.toMap(progress -> progress.getLesson().getId(), progress -> progress));
	}

	private Map<String, Boolean> buildSequenceLockedMap(
			List<Section> sections,
			Map<String, LessonProgress> progressMap,
			boolean enrolled) {
		Map<String, Boolean> lockedMap = new LinkedHashMap<>();
		boolean previousLessonCompleted = true;

		for (Section section : sections) {
			List<Lesson> lessons = lessonRepository.findBySectionIdOrderByOrderIndexAsc(section.getId());

			for (Lesson lesson : lessons) {
				LessonProgress progress = progressMap.get(lesson.getId());
				boolean completed = progress != null && Boolean.TRUE.equals(progress.getCompleted());
				boolean accessibleByEnrollment = enrolled || Boolean.TRUE.equals(lesson.getIsPreview());
				boolean locked = !accessibleByEnrollment || !previousLessonCompleted;

				lockedMap.put(lesson.getId(), locked);
				previousLessonCompleted = completed;
			}
		}

		return lockedMap;
	}

	private List<Lesson> getOrderedLessons(String courseId) {
		List<Lesson> orderedLessons = new ArrayList<>();
		for (Section section : sectionRepository.findByCourseIdOrderByOrderIndexAsc(courseId)) {
			orderedLessons.addAll(lessonRepository.findBySectionIdOrderByOrderIndexAsc(section.getId()));
		}
		return orderedLessons;
	}

	private boolean canMarkLessonCompleted(String userId, Lesson lesson) {
		List<String> requiredQuizIds = new ArrayList<>();

		quizRepository.findFirstByLessonId(lesson.getId())
				.map(quiz -> quiz.getId())
				.ifPresent(requiredQuizIds::add);

		lessonBlockRepository.findByLessonIdOrderByOrderIndexAsc(lesson.getId()).stream()
				.map(LessonBlock::getQuiz)
				.filter(Objects::nonNull)
				.map(quiz -> quiz.getId())
				.filter(quizId -> !requiredQuizIds.contains(quizId))
				.forEach(requiredQuizIds::add);

		for (String quizId : requiredQuizIds) {
			var latestAttempt = quizRepository.findById(quizId)
					.flatMap(quiz -> quizAttemptRepository.findTopByQuizIdAndUserIdOrderByAttemptNoDesc(quizId, userId)
							.map(attempt -> Map.entry(quiz, attempt)))
					.orElse(null);

			if (latestAttempt == null) {
				return false;
			}

			var quiz = latestAttempt.getKey();
			var attempt = latestAttempt.getValue();
			boolean submitted = attempt.getStatus() == com.nt.lms.entity.QuizAttemptStatus.SUBMITTED;
			List<Question> questions = questionRepository.findByQuizIdOrderByOrderIndexAsc(quizId);
			Map<String, QuizAttemptAnswer> answerMap = quizAttemptAnswerRepository.findByAttemptId(attempt.getId())
					.stream()
					.collect(Collectors.toMap(answer -> answer.getQuestion().getId(), answer -> answer, (a, b) -> a));
			boolean allQuestionsCorrect = !questions.isEmpty() && questions.stream().allMatch(question -> {
				QuizAttemptAnswer answer = answerMap.get(question.getId());
				return answer != null
						&& answer.getSelectedOption() != null
						&& Boolean.TRUE.equals(answer.getIsCorrect());
			});
			boolean hasCorrectAnswer = answerMap.values().stream()
					.anyMatch(answer -> Boolean.TRUE.equals(answer.getIsCorrect()));
			boolean passed = allQuestionsCorrect || safeDouble(attempt.getScore()) > 0 || hasCorrectAnswer;

			if (!submitted || !passed) {
				return false;
			}
		}

		var assignment = assignmentRepository.findFirstByLessonId(lesson.getId()).orElse(null);
		if (assignment != null) {
			var submission = assignmentSubmissionRepository.findByAssignmentIdAndStudentId(assignment.getId(), userId)
					.orElse(null);

			if (submission == null) {
				return false;
			}

			String status = submission.getStatus() == null ? "" : submission.getStatus().trim().toUpperCase();
			if (!List.of("SUBMITTED", "LATE", "GRADED").contains(status)) {
				return false;
			}
		}

		return true;
	}

	private double safeDouble(Number value) {
		return value == null ? 0.0 : value.doubleValue();
	}

	private boolean requiresPayment(Course course, User currentUser) {
		if (!Boolean.TRUE.equals(course.getPaid())) {
			return false;
		}
		BigDecimal price = course.getPrice();
		if (price == null || price.compareTo(BigDecimal.ZERO) <= 0) {
			return false;
		}
		boolean isAdmin = currentUser.getRoles() != null
				&& currentUser.getRoles().stream().anyMatch(role -> "ADMIN".equals(role.getName()));
		boolean isOwner = course.getInstructor() != null
				&& currentUser != null
				&& course.getInstructor().getId().equals(currentUser.getId());
		return !isAdmin && !isOwner;
	}

	private LearningLessonResourceResponse toLearningResourceResponse(LessonResource resource) {
		return LearningLessonResourceResponse.builder()
				.id(resource.getId())
				.fileName(resource.getFileName())
				.fileUrl(resource.getFileUrl())
				.fileType(resource.getFileType())
				.fileSize(resource.getFileSize())
				.createdAt(resource.getCreatedAt())
				.build();
	}

	private LearningLessonNoteResponse toLearningNoteResponse(LessonNote note) {
		return LearningLessonNoteResponse.builder()
				.id(note.getId())
				.noteContent(note.getNoteContent())
				.timeMarkerSec(note.getTimeMarkerSec())
				.createdAt(note.getCreatedAt())
				.updatedAt(note.getUpdatedAt())
				.build();
	}

	private void logActivity(User user, Course course, Lesson lesson, String activityType, String activityValue) {
		learningActivityLogRepository.save(LearningActivityLog.builder()
				.user(user)
				.course(course)
				.lesson(lesson)
				.activityType(activityType)
				.activityValue(activityValue)
				.build());
	}
}
