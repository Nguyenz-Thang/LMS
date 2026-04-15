package com.nt.lms.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.nt.lms.dto.response.CourseResponse;
import com.nt.lms.entity.Course;

@Mapper(componentModel = "spring")
public interface CourseMapper {

    @Mapping(target = "instructorName", source = "instructor.fullName")
    @Mapping(target = "categoryName", source = "category.name")
    @Mapping(target = "instructorId", source = "instructor.id")
    @Mapping(target = "categoryId", source = "category.id")
    CourseResponse toCourseResponse(Course course);
}