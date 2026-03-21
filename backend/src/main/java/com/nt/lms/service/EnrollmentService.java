package com.nt.lms.service;

import java.util.List;

import com.nt.lms.dto.request.EnrollmentRequest;
import com.nt.lms.dto.response.EnrollmentResponse;
import com.nt.lms.entity.Course;
import com.nt.lms.entity.Enrollment;
import com.nt.lms.entity.User;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.repository.CourseRepository;
import com.nt.lms.repository.EnrollmentRepository;
import com.nt.lms.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class EnrollmentService {

    EnrollmentRepository enrollmentRepository;
    CourseRepository courseRepository;
    UserRepository userRepository;

    // ✅ ĐĂNG KÝ KHÓA HỌC
    public EnrollmentResponse enroll(EnrollmentRequest request) {

        String username = SecurityContextHolder.getContext()
                .getAuthentication().getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));

        // check đã đăng ký chưa
        if (enrollmentRepository.existsByUserIdAndCourseId(user.getId(), course.getId())) {
            throw new AppException(ErrorCode.ALREADY_ENROLLED);
        }

        Enrollment enrollment = Enrollment.builder()
                .user(user)
                .course(course)
                .build();

        return mapToResponse(enrollmentRepository.save(enrollment));
    }

    // 📚 KHÓA ĐÃ ĐĂNG KÝ
    public List<EnrollmentResponse> getMyCourses() {

        String username = SecurityContextHolder.getContext()
                .getAuthentication().getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        return enrollmentRepository.findByUserId(user.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // 🔁 MAP
    private EnrollmentResponse mapToResponse(Enrollment enrollment) {
        return EnrollmentResponse.builder()
                .id(enrollment.getId())
                .courseId(enrollment.getCourse().getId())
                .courseTitle(enrollment.getCourse().getTitle())
                .build();
    }
}