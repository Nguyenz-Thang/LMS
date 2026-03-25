package com.nt.lms.mapper;

import com.nt.lms.dto.response.SectionResponse;
import com.nt.lms.entity.Section;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SectionMapper {

    @Mapping(target = "courseId", source = "course.id")
    SectionResponse toSectionResponse(Section section);
}