package com.nt.lms.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import com.nt.lms.dto.request.CategoryRequest;
import com.nt.lms.dto.response.CategoryResponse;
import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.service.CategoryService;

import java.util.List;

@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @PostMapping
    public ApiResponse<CategoryResponse> create(@RequestBody CategoryRequest request) {
        return ApiResponse.<CategoryResponse>builder()
                .result(categoryService.create(request))
                .build();
    }

    @GetMapping
    public ApiResponse<List<CategoryResponse>> getAll() {
        return ApiResponse.<List<CategoryResponse>>builder()
                .result(categoryService.getAll())
                .build();
    }

    @PutMapping("/{id}")
    public ApiResponse<CategoryResponse> update(
            @PathVariable String id,
            @RequestBody CategoryRequest request) {
        return ApiResponse.<CategoryResponse>builder()
                .result(categoryService.update(id, request))
                .build();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<String> delete(@PathVariable String id) {
        categoryService.delete(id);
        return ApiResponse.<String>builder()
                .result("Deleted successfully")
                .build();
    }
}
