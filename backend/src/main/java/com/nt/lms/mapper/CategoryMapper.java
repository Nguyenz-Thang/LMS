package com.nt.lms.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

import com.nt.lms.dto.request.CategoryRequest;
import com.nt.lms.dto.response.CategoryResponse;
import com.nt.lms.entity.Category;

@Mapper(componentModel = "spring")
public interface CategoryMapper {

    Category toCategory(CategoryRequest request);

    CategoryResponse toCategoryResponse(Category category);

    void updateCategory(@MappingTarget Category category, CategoryRequest request);
}