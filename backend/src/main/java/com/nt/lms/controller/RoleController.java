package com.nt.lms.controller;

import java.util.List;

import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.dto.request.RoleRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.nt.lms.dto.response.RoleResponse;
import com.nt.lms.service.RoleService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/roles")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class RoleController {

    RoleService roleService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    ApiResponse<RoleResponse> create(@RequestBody RoleRequest request) {
        return ApiResponse.<RoleResponse>builder()
                .result(roleService.create(request))
                .build();
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    ApiResponse<List<RoleResponse>> getAll() {
        return ApiResponse.<List<RoleResponse>>builder()
                .result(roleService.getAll())
                .build();
    }

    @PutMapping("/{role}")
    @PreAuthorize("hasRole('ADMIN')")
    ApiResponse<RoleResponse> update(
            @PathVariable String role,
            @RequestBody RoleRequest request
    ) {
        return ApiResponse.<RoleResponse>builder()
                .result(roleService.update(role, request))
                .build();
    }

    @DeleteMapping("/{role}")
    @PreAuthorize("hasRole('ADMIN')")
    ApiResponse<Void> delete(@PathVariable String role) {
        roleService.delete(role);
        return ApiResponse.<Void>builder().build();
    }
}
