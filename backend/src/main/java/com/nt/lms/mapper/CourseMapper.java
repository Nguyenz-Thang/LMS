package com.nt.lms.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.nt.lms.dto.response.CourseResponse;
import com.nt.lms.entity.Course;

@Mapper(componentModel = "spring")
public interface CourseMapper {

    @Mapping(target = "instructorName", source = "instructor.username")
    @Mapping(target = "categoryName", source = "category.name")
    CourseResponse toCourseResponse(Course course);
}