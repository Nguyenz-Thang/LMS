package com.nt.lms.mapper;

import com.nt.lms.dto.request.UserCreationRequest;
import com.nt.lms.dto.request.UserUpdateRequest;
import com.nt.lms.dto.response.UserResponse;
import com.nt.lms.entity.Role;
import com.nt.lms.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface UserMapper {

    User toUser(UserCreationRequest request);

    UserResponse toUserResponse(User user);

    @Mapping(target = "roles", ignore = true)
    void updateUser(@MappingTarget User user, UserUpdateRequest request);

    // thêm method này
    default String map(Role role) {
        return role.getName();
    }
}
