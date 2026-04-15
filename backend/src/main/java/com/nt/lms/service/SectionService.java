package com.nt.lms.service;

import com.nt.lms.dto.request.SectionRequest;
import com.nt.lms.dto.response.SectionResponse;
import com.nt.lms.entity.Course;
import com.nt.lms.entity.Section;
import com.nt.lms.mapper.SectionMapper;
import com.nt.lms.repository.CourseRepository;
import com.nt.lms.repository.SectionRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SectionService {

    SectionRepository sectionRepository;
    CourseRepository courseRepository;
    SectionMapper sectionMapper;

    public SectionResponse createSection(SectionRequest request) {
        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new RuntimeException("Course not found"));

        Section section = Section.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .orderIndex(request.getOrderIndex() == null ? 1 : request.getOrderIndex())
                .course(course)
                .build();

        return sectionMapper.toSectionResponse(sectionRepository.save(section));
    }

    public List<SectionResponse> getSectionsByCourse(String courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Course not found"));

        return sectionRepository.findByCourseOrderByOrderIndexAsc(course)
                .stream()
                .map(sectionMapper::toSectionResponse)
                .toList();
    }

    public SectionResponse getSection(String id) {
        Section section = sectionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Section not found"));

        return sectionMapper.toSectionResponse(section);
    }

    public SectionResponse updateSection(String id, SectionRequest request) {
        Section section = sectionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Section not found"));

        if (request.getTitle() != null) {
            section.setTitle(request.getTitle());
        }

        if (request.getDescription() != null) {
            section.setDescription(request.getDescription());
        }

        if (request.getOrderIndex() != null) {
            section.setOrderIndex(request.getOrderIndex());
        }

        if (request.getCourseId() != null &&
                !request.getCourseId().equals(section.getCourse().getId())) {
            Course course = courseRepository.findById(request.getCourseId())
                    .orElseThrow(() -> new RuntimeException("Course not found"));
            section.setCourse(course);
        }

        return sectionMapper.toSectionResponse(sectionRepository.save(section));
    }

    public void deleteSection(String id) {
        Section section = sectionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Section not found"));

        sectionRepository.delete(section);
    }
}