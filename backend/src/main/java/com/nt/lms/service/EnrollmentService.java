package com.nt.lms.service;

import java.time.LocalDateTime;
import java.util.List;

import com.nt.lms.dto.request.EnrollmentRequest;
import com.nt.lms.dto.response.EnrollmentResponse;
import com.nt.lms.entity.Course;
import com.nt.lms.entity.Enrollment;
import com.nt.lms.entity.User;
import com.nt.lms.enums.EnrollmentStatus;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.mapper.EnrollmentMapper;
import com.nt.lms.repository.CourseRepository;
import com.nt.lms.repository.EnrollmentRepository;
import com.nt.lms.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class EnrollmentService {

    EnrollmentRepository enrollmentRepository;
    CourseRepository courseRepository;
    UserRepository userRepository;
    EnrollmentMapper enrollmentMapper;

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getAllEnrollments() {
        return enrollmentRepository.findAll()
                .stream()
                .map(enrollmentMapper::toEnrollmentResponse)
                .toList();
    }

    @Transactional
    public EnrollmentResponse enroll(EnrollmentRequest request) {
        if (request == null || request.getCourseId() == null || request.getCourseId().isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        String username = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Course course = courseRepository.findById(request.getCourseId().trim())
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));

        if (enrollmentRepository.existsByUserIdAndCourseId(user.getId(), course.getId())) {
            throw new AppException(ErrorCode.ALREADY_ENROLLED);
        }

        Enrollment enrollment = Enrollment.builder()
                .user(user)
                .course(course)
                .status(EnrollmentStatus.ACTIVE)
                .progressPercent(0.0)
                .enrolledAt(LocalDateTime.now())
                .lastAccessedAt(null)
                .build();

        enrollment = enrollmentRepository.save(enrollment);
        return enrollmentMapper.toEnrollmentResponse(enrollment);
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getMyCourses() {
        String username = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        return enrollmentRepository.findByUserId(user.getId())
                .stream()
                .map(enrollmentMapper::toEnrollmentResponse)
                .toList();
    }

    @Transactional
    public EnrollmentResponse markEnrollmentAccess(String courseId) {
        if (courseId == null || courseId.isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        String username = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseId(user.getId(), courseId.trim())
                .orElseThrow(() -> new AppException(ErrorCode.INVALID_REQUEST));

        enrollment.setLastAccessedAt(LocalDateTime.now());
        enrollment = enrollmentRepository.save(enrollment);

        return enrollmentMapper.toEnrollmentResponse(enrollment);
    }
}