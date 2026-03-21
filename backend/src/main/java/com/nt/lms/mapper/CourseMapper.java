package com.nt.lms.mapper;

import org.mapstruct.Mapper;

import com.nt.lms.dto.response.CourseResponse;
import com.nt.lms.entity.Course;

@Mapper(componentModel = "spring")
public interface CourseMapper {

    CourseResponse toCourseResponse(Course course);
}