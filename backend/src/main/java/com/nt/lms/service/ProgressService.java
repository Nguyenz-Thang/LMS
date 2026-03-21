package com.nt.lms.service;

import com.nt.lms.entity.Lesson;
import com.nt.lms.entity.LessonProgress;
import com.nt.lms.entity.User;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.repository.LessonProgressRepository;
import com.nt.lms.repository.LessonRepository;
import com.nt.lms.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ProgressService {

    LessonProgressRepository progressRepository;
    LessonRepository lessonRepository;
    UserRepository userRepository;

    // ✅ MARK DONE LESSON
    public void completeLesson(String lessonId) {

        String username = SecurityContextHolder.getContext()
                .getAuthentication().getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_EXISTED));

        if (progressRepository.existsByUserIdAndLessonId(user.getId(), lessonId)) {
            return;
        }

        LessonProgress progress = LessonProgress.builder()
                .user(user)
                .lesson(lesson)
                .completed(true)
                .build();

        progressRepository.save(progress);
    }

    // 📊 GET PROGRESS %
    public double getProgress(String courseId) {

        String username = SecurityContextHolder.getContext()
                .getAuthentication().getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        long completed = progressRepository
                .countByUserIdAndLessonCourseIdAndCompletedTrue(user.getId(), courseId);

        long total = lessonRepository.countByCourseId(courseId);

        if (total == 0) return 0;

        return (double) completed / total * 100;
    }
}