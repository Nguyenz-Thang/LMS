package com.nt.lms.mapper;

import com.nt.lms.dto.request.RoleRequest;
import com.nt.lms.dto.response.RoleResponse;
import com.nt.lms.entity.Role;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface RoleMapper {
    Role toRole(RoleRequest request);

    RoleResponse toRoleResponse(Role role);
}