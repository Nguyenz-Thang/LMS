package com.nt.lms.service;

import com.nt.lms.dto.request.CourseRequest;
import com.nt.lms.dto.response.CourseCurriculumResponse;
import com.nt.lms.dto.response.CourseResponse;
import com.nt.lms.dto.response.CurriculumLessonResponse;
import com.nt.lms.dto.response.CurriculumSectionResponse;
import com.nt.lms.dto.response.PageResponse;
import com.nt.lms.entity.Category;
import com.nt.lms.entity.Course;
import com.nt.lms.entity.Section;
import com.nt.lms.entity.User;
import com.nt.lms.enums.LessonType;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.mapper.CourseMapper;
import com.nt.lms.repository.AssignmentRepository;
import com.nt.lms.repository.CategoryRepository;
import com.nt.lms.repository.CourseRepository;
import com.nt.lms.repository.EnrollmentRepository;
import com.nt.lms.repository.LessonRepository;
import com.nt.lms.repository.QuizRepository;
import com.nt.lms.repository.SectionRepository;
import com.nt.lms.repository.UserRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CourseService {

    CourseRepository courseRepository;
    CategoryRepository categoryRepository;
    UserRepository userRepository;
    CourseMapper courseMapper;
    EnrollmentRepository enrollmentRepository;
    SectionRepository sectionRepository;
    LessonRepository lessonRepository;
    QuizRepository quizRepository;
    AssignmentRepository assignmentRepository;
    AppNotificationService appNotificationService;

    public CourseResponse createCourse(CourseRequest request) {
        User currentUser = getCurrentUser();

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_EXISTED));

        Course course = Course.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .thumbnailUrl(request.getThumbnailUrl())
                .instructor(currentUser)
                .category(category)
                .status(defaultStatus(request.getStatus()))
                .visibility(defaultVisibility(request.getVisibility()))
                .level(request.getLevel() == null ? "BEGINNER" : request.getLevel())
                .estimatedHours(request.getEstimatedHours() == null ? 0 : request.getEstimatedHours())
                .price(normalizePrice(request.getPrice()))
                .currency(defaultCurrency(request.getCurrency()))
                .paid(isPaidCourse(request.getPaid(), request.getPrice()))
                .build();

        Course savedCourse = courseRepository.save(course);
        return mapToResponse(savedCourse);
    }

    public List<CourseResponse> getCourses() {
        return filterAccessibleCourses(null, false, null)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public CourseResponse getCourse(String id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));
        ensureCanViewCourse(course);

        return mapToResponse(course);
    }

    public CourseResponse getCourseById(String id) {
        return getCourse(id);
    }

    public CourseCurriculumResponse getCourseCurriculum(String id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));
        ensureCanViewCourse(course);

        List<Section> sections = sectionRepository.findByCourseIdOrderByOrderIndexAsc(course.getId());
        List<String> sectionIds = sections.stream().map(Section::getId).toList();
        Map<String, List<LessonRepository.CurriculumLessonView>> lessonsBySection = sectionIds.isEmpty()
                ? Collections.emptyMap()
                : lessonRepository.findCurriculumLessonsBySectionIds(sectionIds).stream()
                        .collect(Collectors.groupingBy(
                                LessonRepository.CurriculumLessonView::getSectionId,
                                LinkedHashMap::new,
                                Collectors.toList()));
        List<String> lessonIds = lessonsBySection.values().stream()
                .flatMap(List::stream)
                .map(LessonRepository.CurriculumLessonView::getId)
                .toList();
        Map<String, String> quizIdsByLesson = lessonIds.isEmpty()
                ? Collections.emptyMap()
                : quizRepository.findLessonQuizRefs(lessonIds).stream()
                        .collect(Collectors.toMap(
                                QuizRepository.LessonQuizRef::getLessonId,
                                QuizRepository.LessonQuizRef::getId,
                                (first, ignored) -> first));
        Map<String, String> assignmentIdsByLesson = lessonIds.isEmpty()
                ? Collections.emptyMap()
                : assignmentRepository.findLessonAssignmentRefs(lessonIds).stream()
                        .collect(Collectors.toMap(
                                AssignmentRepository.LessonAssignmentRef::getLessonId,
                                AssignmentRepository.LessonAssignmentRef::getId,
                                (first, ignored) -> first));

        List<CurriculumSectionResponse> sectionResponses = sections.stream().map(section -> {
            List<LessonRepository.CurriculumLessonView> lessons =
                    lessonsBySection.getOrDefault(section.getId(), List.of());

            List<CurriculumLessonResponse> lessonResponses = lessons.stream()
                    .map(lesson -> {
                        String quizId = quizIdsByLesson.get(lesson.getId());
                        String assignmentId = assignmentIdsByLesson.get(lesson.getId());

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
                                .content(null)
                                .videoUrl(lesson.getVideoUrl())
                                .thumbnailUrl(lesson.getThumbnailUrl())
                                .durationMinutes(lesson.getDurationMinutes())
                                .isPublished(lesson.getIsPublished())
                                .isPreview(lesson.getIsPreview())
                                .orderIndex(lesson.getOrderIndex())
                                .lessonType(lessonType)
                                .quizId(quizId)
                                .assignmentId(assignmentId)
                                .build();
                    })
                    .toList();

            int totalDurationMinutes = lessons.stream()
                    .map(LessonRepository.CurriculumLessonView::getDurationMinutes)
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
                .instructorAvatar(course.getInstructor() != null ? course.getInstructor().getAvatar() : null)
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

        User currentUser = getCurrentUser();
        boolean isAdmin = hasRole(currentUser, "ADMIN");
        ensureCanManageCourse(course, currentUser, isAdmin);

        courseRepository.delete(course);
    }

    public CourseResponse updateCourse(String id, CourseRequest request) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));

        User currentUser = getCurrentUser();
        boolean isAdmin = hasRole(currentUser, "ADMIN");
        ensureCanManageCourse(course, currentUser, isAdmin);

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

        if (request.getLevel() != null) {
            course.setLevel(request.getLevel());
        }

        if (request.getEstimatedHours() != null) {
            course.setEstimatedHours(request.getEstimatedHours());
        }

        if (request.getPrice() != null) {
            course.setPrice(normalizePrice(request.getPrice()));
            course.setPaid(isPaidCourse(request.getPaid(), request.getPrice()));
        }

        if (request.getCurrency() != null) {
            course.setCurrency(defaultCurrency(request.getCurrency()));
        }

        if (request.getPaid() != null) {
            course.setPaid(Boolean.TRUE.equals(request.getPaid()) && isPositive(course.getPrice()));
        }

        if (request.getStatus() != null) {
            course.setStatus(defaultStatus(request.getStatus()));
        }
        if (request.getVisibility() != null) {
            course.setVisibility(defaultVisibility(request.getVisibility()));
        }

        return mapToResponse(courseRepository.save(course));
    }

    public CourseResponse approveCourse(String id) {
        User currentUser = getCurrentUser();
        ensureAdmin(currentUser);

        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));
        course.setStatus("PUBLISHED");
        course.setVisibility("PUBLIC");

        return mapToResponse(courseRepository.save(course));
    }

    public Page<Course> getCourses(String keyword, boolean manageOnly, String status, int page, int size) {
        return paginate(filterAccessibleCourses(keyword, manageOnly, status), page, size);
    }

    public PageResponse<CourseResponse> getCoursesPage(String keyword, boolean manageOnly, String status, int page, int size) {
        Page<Course> coursePage = paginate(filterAccessibleCourses(keyword, manageOnly, status), page, size);

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
                .instructorAvatar(course.getInstructor() != null ? course.getInstructor().getAvatar() : null)
                .categoryId(course.getCategory() != null ? course.getCategory().getId() : null)
                .categoryName(course.getCategory() != null ? course.getCategory().getName() : null)
                .status(course.getStatus())
                .visibility(course.getVisibility())
                .level(course.getLevel())
                .estimatedHours(course.getEstimatedHours())
                .price(course.getPrice())
                .currency(course.getCurrency() == null ? "VND" : course.getCurrency())
                .paid(Boolean.TRUE.equals(course.getPaid()))
                .enrollmentCount(enrollmentRepository.countByCourseId(course.getId()))
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

    private List<Course> filterAccessibleCourses(String keyword, boolean manageOnly, String status) {
        User currentUser = getCurrentUser();
        boolean isAdmin = hasRole(currentUser, "ADMIN");
        boolean isInstructor = hasRole(currentUser, "INSTRUCTOR");
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase();
        String normalizedStatus = status == null ? "" : status.trim().toUpperCase();

        return courseRepository.findAll().stream()
                .filter(course -> {
                    if (isAdmin) {
                        return true;
                    }

                    if (manageOnly) {
                        return isInstructor && isOwner(course, currentUser);
                    }

                    boolean ownedByInstructor = isInstructor && isOwner(course, currentUser);
                    return ownedByInstructor || isApprovedForStudents(course);
                })
                .filter(course -> !manageOnly || isAdmin || isOwner(course, currentUser))
                .filter(course -> normalizedStatus.isBlank() || normalizedStatus.equalsIgnoreCase(safeText(course.getStatus()).toUpperCase()))
                .filter(course -> normalizedKeyword.isBlank()
                        || safeText(course.getTitle()).contains(normalizedKeyword)
                        || safeText(course.getDescription()).contains(normalizedKeyword)
                        || safeText(getInstructorDisplayName(course)).contains(normalizedKeyword)
                        || safeText(course.getCategory() != null ? course.getCategory().getName() : null).contains(normalizedKeyword))
                .toList();
    }

    private Page<Course> paginate(List<Course> courses, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        int start = Math.min((int) pageable.getOffset(), courses.size());
        int end = Math.min(start + pageable.getPageSize(), courses.size());
        List<Course> content = start <= end ? new ArrayList<>(courses.subList(start, end)) : List.of();
        return new PageImpl<>(content, pageable, courses.size());
    }

    private void ensureCanViewCourse(Course course) {
        User currentUser = getCurrentUser();
        if (hasRole(currentUser, "ADMIN")) {
            return;
        }
        if (hasRole(currentUser, "INSTRUCTOR") && isOwner(course, currentUser)) {
            return;
        }
        if (!isApprovedForStudents(course)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }

    private void ensureCanManageCourse(Course course, User currentUser, boolean isAdmin) {
        if (isAdmin) {
            return;
        }
        if (!isOwner(course, currentUser)) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }

    private void ensureAdmin(User user) {
        if (!hasRole(user, "ADMIN")) {
            throw new AppException(ErrorCode.UNAUTHORIZED);
        }
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext()
                .getAuthentication().getName();

        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
    }

    private boolean hasRole(User user, String roleName) {
        return user.getRoles() != null && user.getRoles().stream().anyMatch(role -> roleName.equals(role.getName()));
    }

    private boolean isOwner(Course course, User user) {
        return course.getInstructor() != null
                && user != null
                && Objects.equals(course.getInstructor().getId(), user.getId());
    }

    private boolean isApprovedForStudents(Course course) {
        return "PUBLISHED".equalsIgnoreCase(course.getStatus())
                && "PUBLIC".equalsIgnoreCase(course.getVisibility());
    }

    private String defaultStatus(String status) {
        return status == null || status.isBlank() ? "PUBLISHED" : status.trim();
    }

    private String defaultVisibility(String visibility) {
        return visibility == null || visibility.isBlank() ? "PUBLIC" : visibility.trim();
    }

    private BigDecimal normalizePrice(BigDecimal price) {
        if (price == null || price.compareTo(BigDecimal.ZERO) < 0) {
            return BigDecimal.ZERO;
        }
        return price;
    }

    private boolean isPaidCourse(Boolean paid, BigDecimal price) {
        if (paid == null) {
            return isPositive(price);
        }
        return Boolean.TRUE.equals(paid) && isPositive(price);
    }

    private boolean isPositive(BigDecimal price) {
        return price != null && price.compareTo(BigDecimal.ZERO) > 0;
    }

    private String defaultCurrency(String currency) {
        return currency == null || currency.isBlank() ? "VND" : currency.trim().toUpperCase();
    }

    private String safeText(String value) {
        return value == null ? "" : value.toLowerCase();
    }
}
