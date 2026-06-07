package com.nt.lms.service;

import java.util.List;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.nt.lms.dto.request.LessonCreationRequest;
import com.nt.lms.dto.request.LessonUpdateRequest;
import com.nt.lms.dto.response.LearningLessonResourceResponse;
import com.nt.lms.dto.response.LessonResponse;
import com.nt.lms.entity.Assignment;
import com.nt.lms.entity.Course;
import com.nt.lms.entity.Lesson;
import com.nt.lms.entity.LessonResource;
import com.nt.lms.entity.Quiz;
import com.nt.lms.entity.Section;
import com.nt.lms.entity.User;
import com.nt.lms.enums.LessonType;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.repository.AssignmentRepository;
import com.nt.lms.repository.LessonRepository;
import com.nt.lms.repository.LessonResourceRepository;
import com.nt.lms.repository.QuizRepository;
import com.nt.lms.repository.SectionRepository;
import com.nt.lms.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LessonService {

    LessonRepository lessonRepository;
    SectionRepository sectionRepository;
    QuizRepository quizRepository;
    AssignmentRepository assignmentRepository;
    LessonResourceRepository lessonResourceRepository;
    UserRepository userRepository;
    FileStorageService fileStorageService;

    public LessonResponse createLesson(LessonCreationRequest request) {
        validateCreateRequest(request);

        Section section = sectionRepository.findById(request.getSectionId())
                .orElseThrow(() -> new AppException(ErrorCode.SECTION_NOT_EXISTED));

        Lesson lesson = Lesson.builder()
                .title(request.getTitle().trim())
                .description(trimToNull(request.getDescription()))
                .content(request.getLessonType() == LessonType.READING ? trimToNull(request.getContent()) : null)
                .videoUrl(request.getLessonType() == LessonType.VIDEO ? trimToNull(request.getVideoUrl()) : null)
                .thumbnailUrl(trimToNull(request.getThumbnailUrl()))
                .durationMinutes(defaultInt(request.getDurationMinutes(), 0))
                .isPublished(defaultBoolean(request.getIsPublished(), true))
                .isPreview(defaultBoolean(request.getIsPreview(), false))
                .orderIndex(defaultInt(request.getOrderIndex(), 1))
                .section(section)
                .build();

        lesson = lessonRepository.save(lesson);

        if (request.getLessonType() == LessonType.QUIZ) {
            createQuizForLesson(lesson, request);
        }

        if (request.getLessonType() == LessonType.ASSIGNMENT) {
            createAssignmentForLesson(lesson, request);
        }

        triggerCreateNotifications(lesson, request.getLessonType());

        return toLessonResponse(lesson);
    }

    public LessonResponse updateLesson(String lessonId, LessonUpdateRequest request) {
        validateUpdateRequest(request);

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_EXISTED));
        boolean wasPublished = Boolean.TRUE.equals(lesson.getIsPublished());
        LessonType previousType = resolveLessonType(lesson);

        Section section = sectionRepository.findById(request.getSectionId())
                .orElseThrow(() -> new AppException(ErrorCode.SECTION_NOT_EXISTED));

        lesson.setTitle(request.getTitle().trim());
        lesson.setDescription(trimToNull(request.getDescription()));
        lesson.setContent(request.getLessonType() == LessonType.READING ? trimToNull(request.getContent()) : null);
        lesson.setVideoUrl(request.getLessonType() == LessonType.VIDEO ? trimToNull(request.getVideoUrl()) : null);
        lesson.setThumbnailUrl(trimToNull(request.getThumbnailUrl()));
        lesson.setDurationMinutes(defaultInt(request.getDurationMinutes(), 0));
        lesson.setIsPublished(defaultBoolean(request.getIsPublished(), true));
        lesson.setIsPreview(defaultBoolean(request.getIsPreview(), false));
        lesson.setOrderIndex(defaultInt(request.getOrderIndex(), 1));
        lesson.setSection(section);

        lesson = lessonRepository.save(lesson);

        if (request.getLessonType() == LessonType.QUIZ) {
            upsertQuizForLesson(lesson, request);
            assignmentRepository.findByLessonId(lesson.getId())
                    .ifPresent(assignmentRepository::delete);
        } else if (request.getLessonType() == LessonType.ASSIGNMENT) {
            upsertAssignmentForLesson(lesson, request);
            quizRepository.findByLessonId(lesson.getId())
                    .ifPresent(quizRepository::delete);
        } else {
            quizRepository.findByLessonId(lesson.getId())
                    .ifPresent(quizRepository::delete);
            assignmentRepository.findByLessonId(lesson.getId())
                    .ifPresent(assignmentRepository::delete);
        }

        triggerUpdateNotifications(lesson, request.getLessonType(), previousType, wasPublished);

        return toLessonResponse(lesson);
    }

    public void deleteLessonById(String lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_EXISTED));

        // Nếu FK trong DB đã ON DELETE CASCADE/SET NULL thì vẫn nên xóa tường minh cho rõ logic service
        quizRepository.findByLessonId(lessonId)
                .ifPresent(quizRepository::delete);

        assignmentRepository.findByLessonId(lessonId)
                .ifPresent(assignmentRepository::delete);

        lessonResourceRepository.findByLessonIdOrderByCreatedAtAsc(lessonId)
                .forEach(resource -> {
                    lessonResourceRepository.delete(resource);
                    fileStorageService.deleteByPublicUrl(resource.getFileUrl());
                });

        lessonRepository.delete(lesson);
    }

    public List<LearningLessonResourceResponse> getLessonResources(String lessonId) {
        if (!lessonRepository.existsById(lessonId)) {
            throw new AppException(ErrorCode.LESSON_NOT_EXISTED);
        }

        return lessonResourceRepository.findByLessonIdOrderByCreatedAtAsc(lessonId)
                .stream()
                .map(this::toResourceResponse)
                .toList();
    }

    public List<LearningLessonResourceResponse> uploadLessonResources(String lessonId, MultipartFile[] files) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_EXISTED));

        if (files == null || files.length == 0) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        String uploadDirectory = "uploads/lesson-resources/" + lessonId;

        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }

            String savedName = fileStorageService.store(file, uploadDirectory);
            String originalName = file.getOriginalFilename();

            lessonResourceRepository.save(LessonResource.builder()
                    .lesson(lesson)
                    .fileName(isBlank(originalName) ? savedName : originalName)
                    .fileUrl("/uploads/lesson-resources/" + lessonId + "/" + savedName)
                    .fileType(file.getContentType())
                    .fileSize(file.getSize())
                    .build());
        }

        return getLessonResources(lessonId);
    }

    public void deleteLessonResource(String lessonId, String resourceId) {
        LessonResource resource = lessonResourceRepository.findById(resourceId)
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        if (resource.getLesson() == null || !lessonId.equals(resource.getLesson().getId())) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        lessonResourceRepository.delete(resource);
        fileStorageService.deleteByPublicUrl(resource.getFileUrl());
    }

    private LessonResponse toLessonResponse(Lesson lesson) {
        String quizId = quizRepository.findByLessonId(lesson.getId())
                .map(Quiz::getId)
                .orElse(null);

        String assignmentId = assignmentRepository.findByLessonId(lesson.getId())
                .map(Assignment::getId)
                .orElse(null);

        return LessonResponse.builder()
                .id(lesson.getId())
                .title(lesson.getTitle())
                .description(lesson.getDescription())
                .content(lesson.getContent())
                .videoUrl(lesson.getVideoUrl())
                .thumbnailUrl(lesson.getThumbnailUrl())
                .durationMinutes(lesson.getDurationMinutes())
                .isPublished(lesson.getIsPublished())
                .isPreview(lesson.getIsPreview())
                .orderIndex(lesson.getOrderIndex())
                .sectionId(lesson.getSection().getId())
                .lessonType(resolveLessonType(lesson))
                .quizId(quizId)
                .assignmentId(assignmentId)
                .build();
    }

    private LearningLessonResourceResponse toResourceResponse(LessonResource resource) {
        return LearningLessonResourceResponse.builder()
                .id(resource.getId())
                .fileName(resource.getFileName())
                .fileUrl(resource.getFileUrl())
                .fileType(resource.getFileType())
                .fileSize(resource.getFileSize())
                .createdAt(resource.getCreatedAt())
                .build();
    }

    private LessonType resolveLessonType(Lesson lesson) {
        if (quizRepository.findByLessonId(lesson.getId()).isPresent()) {
            return LessonType.QUIZ;
        }
        if (assignmentRepository.findByLessonId(lesson.getId()).isPresent()) {
            return LessonType.ASSIGNMENT;
        }
        if (lesson.getVideoUrl() != null && !lesson.getVideoUrl().isBlank()) {
            return LessonType.VIDEO;
        }
        return LessonType.READING;
    }

    private void createQuizForLesson(Lesson lesson, LessonCreationRequest request) {
        Course course = lesson.getSection().getCourse();

        Quiz quiz = Quiz.builder()
                .title(isBlank(request.getQuizTitle()) ? lesson.getTitle() : request.getQuizTitle().trim())
                .description(trimToNull(request.getQuizDescription()))
                .course(course)
                .lesson(lesson)
                .quizScope("LESSON")
                .timeLimitMinutes(null)
                .maxAttempts(1)
                .isPublished(true)
                .createdSource("MANUAL")
                .createdBy(getCurrentUserOrNull())
                .build();

        quizRepository.save(quiz);
    }

    private void upsertQuizForLesson(Lesson lesson, LessonUpdateRequest request) {
        Course course = lesson.getSection().getCourse();

        Quiz quiz = quizRepository.findByLessonId(lesson.getId())
                .orElseGet(() -> Quiz.builder()
                        .lesson(lesson)
                        .course(course)
                        .build());

        quiz.setTitle(isBlank(request.getQuizTitle()) ? lesson.getTitle() : request.getQuizTitle().trim());
        quiz.setDescription(trimToNull(request.getQuizDescription()));
        quiz.setCourse(course);
        quiz.setLesson(lesson);
        quiz.setQuizScope("LESSON");
        quiz.setTimeLimitMinutes(null);
        if (quiz.getMaxAttempts() == null) {
            quiz.setMaxAttempts(1);
        }
        if (quiz.getIsPublished() == null) {
            quiz.setIsPublished(true);
        }
        if (quiz.getCreatedSource() == null) {
            quiz.setCreatedSource("MANUAL");
        }
        if (quiz.getCreatedBy() == null) {
            quiz.setCreatedBy(getCurrentUserOrNull());
        }

        quizRepository.save(quiz);
    }

    private void createAssignmentForLesson(Lesson lesson, LessonCreationRequest request) {
        Course course = lesson.getSection().getCourse();
        User currentUser = getCurrentUser();

        Assignment assignment = Assignment.builder()
                .course(course)
                .lesson(lesson)
                .title(isBlank(request.getAssignmentTitle()) ? lesson.getTitle() : request.getAssignmentTitle().trim())
                .description(trimToNull(request.getAssignmentDescription()))
                .assignmentType(
                        isBlank(request.getAssignmentType())
                                ? "ESSAY"
                                : request.getAssignmentType().trim()
                )
                .createdBy(currentUser)
                .build();

        assignmentRepository.save(assignment);
    }

    private void upsertAssignmentForLesson(Lesson lesson, LessonUpdateRequest request) {
        Course course = lesson.getSection().getCourse();
        User currentUser = getCurrentUser();

        Assignment assignment = assignmentRepository.findByLessonId(lesson.getId())
                .orElseGet(() -> Assignment.builder()
                        .lesson(lesson)
                        .course(course)
                        .createdBy(currentUser)
                        .build());

        assignment.setCourse(course);
        assignment.setLesson(lesson);
        assignment.setTitle(
                isBlank(request.getAssignmentTitle())
                        ? lesson.getTitle()
                        : request.getAssignmentTitle().trim()
        );
        assignment.setDescription(trimToNull(request.getAssignmentDescription()));
        assignment.setAssignmentType(
                isBlank(request.getAssignmentType())
                        ? "ESSAY"
                        : request.getAssignmentType().trim()
        );
        if (assignment.getCreatedBy() == null) {
            assignment.setCreatedBy(currentUser);
        }

        assignmentRepository.save(assignment);
    }

    private void triggerCreateNotifications(Lesson lesson, LessonType lessonType) {
        if (!Boolean.TRUE.equals(lesson.getIsPublished())) {
            return;
        }

    }

    private void triggerUpdateNotifications(
            Lesson lesson,
            LessonType currentType,
            LessonType previousType,
            boolean wasPublished) {
        if (!Boolean.TRUE.equals(lesson.getIsPublished()) || wasPublished) {
            return;
        }

    }

    private void validateCreateRequest(LessonCreationRequest request) {
        if (request == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (isBlank(request.getTitle()) || isBlank(request.getSectionId()) || request.getLessonType() == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (defaultInt(request.getOrderIndex(), 1) < 1) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (defaultInt(request.getDurationMinutes(), 0) < 0) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        switch (request.getLessonType()) {
            case VIDEO -> {
                if (isBlank(request.getVideoUrl())) {
                    throw new AppException(ErrorCode.INVALID_REQUEST);
                }
            }
            case READING -> {
                if (isBlank(request.getContent())) {
                    throw new AppException(ErrorCode.INVALID_REQUEST);
                }
            }
            case QUIZ -> {
                // title lesson là đủ, quizTitle có thể để trống để lấy theo title lesson
            }
            case ASSIGNMENT -> {
                // assignmentTitle có thể để trống để lấy theo title lesson
            }
        }
    }

    private void validateUpdateRequest(LessonUpdateRequest request) {
        if (request == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (isBlank(request.getTitle()) || isBlank(request.getSectionId()) || request.getLessonType() == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (defaultInt(request.getOrderIndex(), 1) < 1) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (defaultInt(request.getDurationMinutes(), 0) < 0) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        switch (request.getLessonType()) {
            case VIDEO -> {
                if (isBlank(request.getVideoUrl())) {
                    throw new AppException(ErrorCode.INVALID_REQUEST);
                }
            }
            case READING -> {
                if (isBlank(request.getContent())) {
                    throw new AppException(ErrorCode.INVALID_REQUEST);
                }
            }
            case QUIZ, ASSIGNMENT -> {
            }
        }
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    private User getCurrentUserOrNull() {
        try {
            return getCurrentUser();
        } catch (Exception e) {
            return null;
        }
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private Integer defaultInt(Integer value, Integer defaultValue) {
        return value == null ? defaultValue : value;
    }

    private Boolean defaultBoolean(Boolean value, Boolean defaultValue) {
        return value == null ? defaultValue : value;
    }
}
