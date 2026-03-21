package com.nt.lms.service;

import java.util.List;

import com.nt.lms.dto.request.LessonRequest;
import com.nt.lms.dto.response.LessonResponse;
import com.nt.lms.entity.Course;
import com.nt.lms.entity.Lesson;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.repository.CourseRepository;
import com.nt.lms.repository.LessonRepository;

import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.AccessLevel;

import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LessonService {

    LessonRepository lessonRepository;
    CourseRepository courseRepository;

    // ✅ CREATE
    public LessonResponse createLesson(LessonRequest request) {

        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new AppException(ErrorCode.COURSE_NOT_EXISTED));

        Lesson lesson = Lesson.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .videoUrl(request.getVideoUrl())
                .orderIndex(request.getOrderIndex())
                .course(course)
                .build();

        return mapToResponse(lessonRepository.save(lesson));
    }

    // 📚 GET BY COURSE
    public List<LessonResponse> getLessonsByCourse(String courseId) {
        return lessonRepository.findByCourseIdOrderByOrderIndexAsc(courseId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // 🔍 DETAIL
    public LessonResponse getLesson(String id) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_EXISTED));

        return mapToResponse(lesson);
    }

    // 🔄 UPDATE
    public LessonResponse updateLesson(String id, LessonRequest request) {

        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_EXISTED));

        lesson.setTitle(request.getTitle());
        lesson.setContent(request.getContent());
        lesson.setVideoUrl(request.getVideoUrl());
        lesson.setOrderIndex(request.getOrderIndex());

        return mapToResponse(lessonRepository.save(lesson));
    }

    // ❌ DELETE
    public void deleteLesson(String id) {
        lessonRepository.deleteById(id);
    }

    // 🔁 MAP
    private LessonResponse mapToResponse(Lesson lesson) {
        return LessonResponse.builder()
                .id(lesson.getId())
                .title(lesson.getTitle())
                .content(lesson.getContent())
                .orderIndex(lesson.getOrderIndex())
                .build();
    }
}