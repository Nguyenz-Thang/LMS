package com.nt.lms.mapper;

import com.nt.lms.dto.response.LessonResponse;
import com.nt.lms.entity.Lesson;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface LessonMapper {

    @Mapping(target = "sectionId", source = "section.id")
    LessonResponse toLessonResponse(Lesson lesson);
}