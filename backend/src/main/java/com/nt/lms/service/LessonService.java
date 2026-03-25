package com.nt.lms.service;

import com.nt.lms.dto.request.LessonRequest;
import com.nt.lms.dto.response.LessonResponse;
import com.nt.lms.entity.Lesson;
import com.nt.lms.entity.Section;
import com.nt.lms.mapper.LessonMapper;
import com.nt.lms.repository.LessonRepository;
import com.nt.lms.repository.SectionRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class LessonService {

    LessonRepository lessonRepository;
    SectionRepository sectionRepository;
    LessonMapper lessonMapper;

    public LessonResponse createLesson(LessonRequest request) {
        Section section = sectionRepository.findById(request.getSectionId())
                .orElseThrow(() -> new RuntimeException("Section not found"));

        Lesson lesson = Lesson.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .videoUrl(request.getVideoUrl())
                .duration(request.getDuration())
                .lessonType(request.getLessonType())
                .isPreview(request.getIsPreview())
                .orderIndex(request.getOrderIndex() == null ? 1 : request.getOrderIndex())
                .section(section)
                .build();

        return lessonMapper.toLessonResponse(lessonRepository.save(lesson));
    }

    public List<LessonResponse> getLessonsBySection(String sectionId) {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new RuntimeException("Section not found"));

        return lessonRepository.findBySectionOrderByOrderIndexAsc(section)
                .stream()
                .map(lessonMapper::toLessonResponse)
                .toList();
    }

    public LessonResponse getLesson(String id) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lesson not found"));

        return lessonMapper.toLessonResponse(lesson);
    }

    public LessonResponse updateLesson(String id, LessonRequest request) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lesson not found"));

        if (request.getTitle() != null) lesson.setTitle(request.getTitle());
        if (request.getContent() != null) lesson.setContent(request.getContent());
        if (request.getVideoUrl() != null) lesson.setVideoUrl(request.getVideoUrl());
        if (request.getDuration() != null) lesson.setDuration(request.getDuration());
        if (request.getLessonType() != null) lesson.setLessonType(request.getLessonType());
        if (request.getIsPreview() != null) lesson.setIsPreview(request.getIsPreview());
        if (request.getOrderIndex() != null) lesson.setOrderIndex(request.getOrderIndex());

        if (request.getSectionId() != null &&
                !request.getSectionId().equals(lesson.getSection().getId())) {
            Section section = sectionRepository.findById(request.getSectionId())
                    .orElseThrow(() -> new RuntimeException("Section not found"));
            lesson.setSection(section);
        }

        return lessonMapper.toLessonResponse(lessonRepository.save(lesson));
    }

    public void deleteLesson(String id) {
        Lesson lesson = lessonRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Lesson not found"));

        lessonRepository.delete(lesson);
    }
}