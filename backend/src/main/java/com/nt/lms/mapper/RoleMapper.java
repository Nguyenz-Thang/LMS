package com.nt.lms.mapper;

import com.nt.lms.dto.request.RoleRequest;
import com.nt.lms.entity.Role;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.nt.lms.dto.response.RoleResponse;

@Mapper(componentModel = "spring")
public interface RoleMapper {
    @Mapping(target = "permissions", ignore = true)
    Role toRole(RoleRequest request);

    RoleResponse toRoleResponse(Role role);
}
