package com.nt.lms.service;

import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.nt.lms.dto.request.RoleRequest;
import com.nt.lms.dto.response.RoleResponse;
import com.nt.lms.entity.Role;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.mapper.RoleMapper;
import com.nt.lms.repository.RoleRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RoleService {

    RoleRepository roleRepository;
    RoleMapper roleMapper;

    static final Set<String> SYSTEM_ROLES = Set.of("ADMIN", "STUDENT");

    @Transactional
    public RoleResponse create(RoleRequest request) {
        validateCreateRequest(request);

        String roleName = request.getName().trim();

        if (roleRepository.existsById(roleName)) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        Role role = roleMapper.toRole(request);
        role.setName(roleName);
        role.setDescription(trimToNull(request.getDescription()));

        role = roleRepository.save(role);
        return roleMapper.toRoleResponse(role);
    }

    public List<RoleResponse> getAll() {
        return roleRepository.findAll()
                .stream()
                .map(roleMapper::toRoleResponse)
                .toList();
    }

    public RoleResponse getByName(String roleName) {
        Role role = roleRepository.findById(roleName)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_EXISTED));

        return roleMapper.toRoleResponse(role);
    }

    @Transactional
    public RoleResponse update(String roleName, RoleRequest request) {
        validateUpdateRequest(request);

        Role role = roleRepository.findById(roleName)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_EXISTED));

        role.setDescription(trimToNull(request.getDescription()));

        role = roleRepository.save(role);
        return roleMapper.toRoleResponse(role);
    }

    @Transactional
    public void delete(String roleName) {
        Role role = roleRepository.findById(roleName)
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_EXISTED));

        if (SYSTEM_ROLES.contains(role.getName())) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (role.getUsers() != null && !role.getUsers().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        roleRepository.delete(role);
    }

    private void validateCreateRequest(RoleRequest request) {
        if (request == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (request.getDescription() == null || request.getDescription().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }
    }

    private void validateUpdateRequest(RoleRequest request) {
        if (request == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (request.getDescription() == null || request.getDescription().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}