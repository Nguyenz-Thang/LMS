package com.nt.lms.service;

import com.nt.lms.dto.request.CourseRequest;
import com.nt.lms.dto.response.*;
import com.nt.lms.entity.Assignment;
import com.nt.lms.entity.Category;
import com.nt.lms.entity.Course;
import com.nt.lms.entity.Lesson;
import com.nt.lms.entity.Quiz;
import com.nt.lms.entity.Section;
import com.nt.lms.entity.User;
import com.nt.lms.enums.LessonType;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.mapper.CourseMapper;
import com.nt.lms.repository.*;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CourseService {

    CourseRepository courseRepository;
    CategoryRepository categoryRepository;
    UserRepository userRepository;
    CourseMapper courseMapper;
    SectionRepository sectionRepository;
    LessonRepository lessonRepository;
    QuizRepository quizRepository;
    AssignmentRepository assignmentRepository;

    public CourseResponse createCourse(CourseRequest request) {
        String username = SecurityContextHolder.getContext()
                .getAuthentication().getName();

        User instructor = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_EXISTED));

        Course course = Course.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .thumbnailUrl(request.getThumbnailUrl())
                .instructor(instructor)
                .category(category)
                .status(request.getStatus() == null ? "DRAFT" : request.getStatus())
                .visibility(request.getVisibility() == null ? "PUBLIC" : request.getVisibility())
                .level(request.getLevel() == null ? "BEGINNER" : request.getLevel())
                .estimatedHours(request.getEstimatedHours() == null ? 0 : request.getEstimatedHours())
                .build();

        return mapToResponse(courseRepository.save(course));
    }

    public List<CourseResponse> getCourses() {
        return courseRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public CourseResponse getCourse(String id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));

        return mapToResponse(course);
    }

    public CourseResponse getCourseById(String id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));

        return mapToResponse(course);
    }

    public CourseCurriculumResponse getCourseCurriculum(String id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));

        List<Section> sections = sectionRepository.findByCourseOrderByOrderIndexAsc(course);

        List<CurriculumSectionResponse> sectionResponses = sections.stream().map(section -> {
            List<Lesson> lessons = lessonRepository.findBySectionOrderByOrderIndexAsc(section);

            List<CurriculumLessonResponse> lessonResponses = lessons.stream()
                    .map(lesson -> {
                        String quizId = quizRepository.findByLessonId(lesson.getId())
                                .map(Quiz::getId)
                                .orElse(null);

                        String assignmentId = assignmentRepository.findByLessonId(lesson.getId())
                                .map(Assignment::getId)
                                .orElse(null);

                        LessonType lessonType;
                        if (quizId != null) {
                            lessonType = LessonType.QUIZ;
                        } else if (assignmentId != null) {
                            lessonType = LessonType.ASSIGNMENT;
                        } else if (lesson.getVideoUrl() != null && !lesson.getVideoUrl().isBlank()) {
                            lessonType = LessonType.VIDEO;
                        } else {
                            lessonType = LessonType.READING;
                        }

                        return CurriculumLessonResponse.builder()
                                .id(lesson.getId())
                                .title(lesson.getTitle())
                                .description(lesson.getDescription())
                                .content(lesson.getContent())
                                .videoUrl(lesson.getVideoUrl())
                                .thumbnailUrl(lesson.getThumbnailUrl())
                                .durationMinutes(lesson.getDurationMinutes())
                                .isPreview(lesson.getIsPreview())
                                .isPublished(lesson.getIsPublished())
                                .orderIndex(lesson.getOrderIndex())
                                .lessonType(lessonType)
                                .quizId(quizId)
                                .assignmentId(assignmentId)
                                .build();
                    })
                    .toList();

            int totalDurationMinutes = lessons.stream()
                    .map(Lesson::getDurationMinutes)
                    .filter(Objects::nonNull)
                    .mapToInt(Integer::intValue)
                    .sum();

            return CurriculumSectionResponse.builder()
                    .id(section.getId())
                    .title(section.getTitle())
                    .description(section.getDescription())
                    .orderIndex(section.getOrderIndex())
                    .totalLessons(lessons.size())
                    .totalDurationMinutes(totalDurationMinutes)
                    .lessons(lessonResponses)
                    .build();
        }).toList();

        return CourseCurriculumResponse.builder()
                .id(course.getId())
                .title(course.getTitle())
                .description(course.getDescription())
                .thumbnailUrl(course.getThumbnailUrl())
                .instructorId(course.getInstructor() != null ? course.getInstructor().getId() : null)
                .instructorName(getInstructorDisplayName(course))
                .categoryId(course.getCategory() != null ? course.getCategory().getId() : null)
                .categoryName(course.getCategory() != null ? course.getCategory().getName() : null)
                .status(course.getStatus())
                .visibility(course.getVisibility())
                .level(course.getLevel())
                .estimatedHours(course.getEstimatedHours())
                .sections(sectionResponses)
                .build();
    }

    public void deleteCourse(String id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));

        courseRepository.delete(course);
    }

    public CourseResponse updateCourse(String id, CourseRequest request) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_EXISTED));
            course.setCategory(category);
        }

        if (request.getTitle() != null) {
            course.setTitle(request.getTitle());
        }

        if (request.getDescription() != null) {
            course.setDescription(request.getDescription());
        }

        if (request.getThumbnailUrl() != null) {
            course.setThumbnailUrl(request.getThumbnailUrl());
        }

        if (request.getStatus() != null) {
            course.setStatus(request.getStatus());
        }

        if (request.getVisibility() != null) {
            course.setVisibility(request.getVisibility());
        }

        if (request.getLevel() != null) {
            course.setLevel(request.getLevel());
        }

        if (request.getEstimatedHours() != null) {
            course.setEstimatedHours(request.getEstimatedHours());
        }

        return mapToResponse(courseRepository.save(course));
    }

    public Page<Course> getCourses(String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        if (keyword != null && !keyword.isBlank()) {
            return courseRepository.findByTitleContainingIgnoreCase(keyword, pageable);
        }

        return courseRepository.findAll(pageable);
    }

    public PageResponse<CourseResponse> getCoursesPage(String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);

        Page<Course> coursePage;
        if (keyword != null && !keyword.isBlank()) {
            coursePage = courseRepository.findByTitleContainingIgnoreCase(keyword, pageable);
        } else {
            coursePage = courseRepository.findAll(pageable);
        }

        return PageResponse.<CourseResponse>builder()
                .content(coursePage.getContent().stream()
                        .map(this::mapToResponse)
                        .toList())
                .page(coursePage.getNumber())
                .size(coursePage.getSize())
                .totalElements(coursePage.getTotalElements())
                .totalPages(coursePage.getTotalPages())
                .build();
    }

    private CourseResponse mapToResponse(Course course) {
        return CourseResponse.builder()
                .id(course.getId())
                .title(course.getTitle())
                .description(course.getDescription())
                .thumbnailUrl(course.getThumbnailUrl())
                .instructorId(course.getInstructor() != null ? course.getInstructor().getId() : null)
                .instructorName(getInstructorDisplayName(course))
                .categoryId(course.getCategory() != null ? course.getCategory().getId() : null)
                .categoryName(course.getCategory() != null ? course.getCategory().getName() : null)
                .status(course.getStatus())
                .visibility(course.getVisibility())
                .level(course.getLevel())
                .estimatedHours(course.getEstimatedHours())
                .build();
    }

    private String getInstructorDisplayName(Course course) {
        if (course.getInstructor() == null) {
            return null;
        }

        if (course.getInstructor().getFullName() != null && !course.getInstructor().getFullName().isBlank()) {
            return course.getInstructor().getFullName();
        }

        return course.getInstructor().getUsername();
    }
}