package com.nt.lms.service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.nt.lms.dto.request.RegisterRequest;
import com.nt.lms.dto.request.UserCreationRequest;
import com.nt.lms.dto.request.UserUpdateRequest;
import com.nt.lms.dto.response.UserResponse;
import com.nt.lms.entity.Role;
import com.nt.lms.entity.User;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.mapper.UserMapper;
import com.nt.lms.repository.RoleRepository;
import com.nt.lms.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

import org.springframework.security.access.prepost.PostAuthorize;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class UserService {

    UserRepository userRepository;
    RoleRepository roleRepository;
    UserMapper userMapper;
    PasswordEncoder passwordEncoder;

    // 🔐 REGISTER (đơn giản: username + password)
    public UserResponse register(RegisterRequest request) {

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        // lấy role STUDENT
        Role role = roleRepository.findById("STUDENT")
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_EXISTED));

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .roles(Set.of(role))
                .build();

        return userMapper.toUserResponse(userRepository.save(user));
    }

    // 🧑‍💼 ADMIN tạo user
    public UserResponse createUser(UserCreationRequest request) {

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        User user = userMapper.toUser(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        // default role STUDENT
        Role role = roleRepository.findById("STUDENT")
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_EXISTED));

        user.setRoles(Set.of(role));

        return userMapper.toUserResponse(userRepository.save(user));
    }

    // 👥 ADMIN xem danh sách user
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserResponse> getUsers() {
        log.info("In method get Users");
        return userRepository.findAll()
                .stream()
                .map(userMapper::toUserResponse)
                .toList();
    }

    // 🔍 Xem user (chỉ chính nó)
    @PostAuthorize("returnObject.username == authentication.name")
    public UserResponse getUser(String id) {
        log.info("In method get user by Id");
        return userMapper.toUserResponse(
                userRepository.findById(id)
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED)));
    }

    // 👤 Lấy info bản thân
    public UserResponse getMyInfo() {
        String username = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        return userMapper.toUserResponse(user);
    }

    // ✏️ Update user
    public UserResponse updateUser(String userId, UserUpdateRequest request) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        userMapper.updateUser(user, request);

        if (request.getPassword() != null) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            var roles = roleRepository.findAllById(request.getRoles());
            user.setRoles(new HashSet<>(roles));
        }

        return userMapper.toUserResponse(userRepository.save(user));
    }

    // ❌ Delete user
    public void deleteUser(String userId) {
        if (!userRepository.existsById(userId)) {
            throw new AppException(ErrorCode.USER_NOT_EXISTED);
        }
        userRepository.deleteById(userId);
    }

}