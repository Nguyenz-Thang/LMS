package com.nt.lms.service;

import java.util.List;

import com.nt.lms.dto.request.CourseRequest;
import com.nt.lms.dto.response.CourseResponse;
import com.nt.lms.dto.response.PageResponse;
import com.nt.lms.entity.Category;
import com.nt.lms.entity.Course;
import com.nt.lms.entity.User;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.mapper.CourseMapper;
import com.nt.lms.repository.CategoryRepository;
import com.nt.lms.repository.CourseRepository;
import com.nt.lms.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;

import org.springframework.data.domain.Page;
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
    // ✅ CREATE COURSE
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
                .instructor(instructor)
                .category(category)
                .build();

        return mapToResponse(courseRepository.save(course));
    }

    // 📚 GET ALL
    public List<CourseResponse> getCourses() {
        return courseRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // 🔍 GET DETAIL
    public CourseResponse getCourse(String id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));
        return mapToResponse(course);
    }

    // ❌ DELETE
    public void deleteCourse(String id) {
        courseRepository.deleteById(id);
    }

    // 🔄 UPDATE
    public CourseResponse updateCourse(String id, CourseRequest request) {

        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new AppException(ErrorCode.CATEGORY_NOT_EXISTED));

        course.setTitle(request.getTitle());
        course.setDescription(request.getDescription());
        course.setCategory(category);

        return mapToResponse(courseRepository.save(course));
    }
    public Page<Course> getCourses(String keyword, int page, int size) {

        Pageable pageable = PageRequest.of(page, size);

        if (keyword != null && !keyword.isBlank()) {
            return courseRepository.findByTitleContainingIgnoreCase(keyword, pageable);
        }

        return courseRepository.findAll(pageable);
    }

    // 🔁 MAP
    private CourseResponse mapToResponse(Course course) {
        return CourseResponse.builder()
                .id(course.getId())
                .title(course.getTitle())
                .description(course.getDescription())
                .instructorName(course.getInstructor().getUsername())
                .categoryName(course.getCategory().getName())
                .build();
    }
    public PageResponse<CourseResponse> getCoursesPage(String keyword, int page, int size){

        Pageable pageable = PageRequest.of(page, size);

        Page<Course> coursePage;

        if (keyword != null && !keyword.isBlank()) {
            coursePage = courseRepository.findByTitleContainingIgnoreCase(keyword, pageable);
        } else {
            coursePage = courseRepository.findAll(pageable);
        }

        return PageResponse.<CourseResponse>builder()
                .content(coursePage.getContent().stream()
                        .map(courseMapper::toCourseResponse)
                        .toList())
                .page(coursePage.getNumber())
                .size(coursePage.getSize())
                .totalElements(coursePage.getTotalElements())
                .totalPages(coursePage.getTotalPages())
                .build();
    }
}