package com.nt.lms.mapper;

import com.nt.lms.dto.request.PermissionRequest;
import com.nt.lms.entity.Permission;
import org.mapstruct.Mapper;

import com.nt.lms.dto.response.PermissionResponse;

@Mapper(componentModel = "spring")
public interface PermissionMapper {

    Permission toPermission(PermissionRequest request);

    PermissionResponse toPermissionResponse(Permission permission);
}
