package com.nt.lms.service;

import java.util.ArrayList;
import java.util.List;

import com.nt.lms.dto.request.ChangePasswordRequest;
import com.nt.lms.dto.request.RegisterRequest;
import com.nt.lms.dto.request.UserCreationRequest;
import com.nt.lms.dto.request.UserUpdateRequest;
import com.nt.lms.dto.response.PageResponse;
import com.nt.lms.dto.response.UserResponse;
import com.nt.lms.entity.Role;
import com.nt.lms.entity.User;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.mapper.UserMapper;
import com.nt.lms.repository.AssignmentSubmissionRepository;
import com.nt.lms.repository.CourseRepository;
import com.nt.lms.repository.DiscussionReplyRepository;
import com.nt.lms.repository.DiscussionTopicRepository;
import com.nt.lms.repository.EnrollmentRepository;
import com.nt.lms.repository.LessonProgressRepository;
import com.nt.lms.repository.PaymentRepository;
import com.nt.lms.repository.QuizAttemptRepository;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class UserService {

    UserRepository userRepository;
    RoleRepository roleRepository;
    CourseRepository courseRepository;
    EnrollmentRepository enrollmentRepository;
    LessonProgressRepository lessonProgressRepository;
    QuizAttemptRepository quizAttemptRepository;
    PaymentRepository paymentRepository;
    AssignmentSubmissionRepository assignmentSubmissionRepository;
    DiscussionTopicRepository discussionTopicRepository;
    DiscussionReplyRepository discussionReplyRepository;
    UserMapper userMapper;
    PasswordEncoder passwordEncoder;

    public UserResponse register(RegisterRequest request) {
        if (request.getUsername() == null || request.getPassword() == null || request.getEmail() == null) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new AppException(ErrorCode.PASSWORD_NOT_MATCH);
        }

        Role role = roleRepository.findById("STUDENT")
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_EXISTED));

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .build();

        return userMapper.toUserResponse(userRepository.save(user));
    }

    public UserResponse createUser(UserCreationRequest request) {
        if (request == null
                || request.getUsername() == null || request.getUsername().isBlank()
                || request.getEmail() == null || request.getEmail().isBlank()
                || request.getPassword() == null || request.getPassword().isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }

        User user = userMapper.toUser(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        user.setRole(resolveRoleOrDefault(request.getRole()));

        return userMapper.toUserResponse(userRepository.save(user));
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<UserResponse> getUsers() {
        log.info("In method get Users");
        return userRepository.findAll()
                .stream()
                .map(userMapper::toUserResponse)
                .toList();
    }

    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<UserResponse> searchUsers(String keyword, String role, int page, int size) {
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase();
        String normalizedRole = role == null ? "" : role.trim().toUpperCase();
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);

        List<UserResponse> filtered = userRepository.findAll()
                .stream()
                .filter(user -> normalizedRole.isBlank()
                        || (user.getRole() != null
                                && normalizedRole.equalsIgnoreCase(user.getRole().getName())))
                .filter(user -> normalizedKeyword.isBlank()
                        || safeText(user.getUsername()).contains(normalizedKeyword)
                        || safeText(user.getFullName()).contains(normalizedKeyword)
                        || safeText(user.getEmail()).contains(normalizedKeyword)
                        || safeText(user.getId()).contains(normalizedKeyword))
                .map(userMapper::toUserResponse)
                .toList();

        int start = Math.min(safePage * safeSize, filtered.size());
        int end = Math.min(start + safeSize, filtered.size());
        List<UserResponse> content = filtered.subList(start, end);

        return PageResponse.<UserResponse>builder()
                .content(content)
                .page(safePage)
                .size(safeSize)
                .totalElements((long) filtered.size())
                .totalPages((int) Math.ceil((double) filtered.size() / safeSize))
                .build();
    }

    @PostAuthorize("returnObject.username == authentication.name or hasRole('ADMIN')")
    public UserResponse getMyInfo() {
        String username = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        return userMapper.toUserResponse(user);
    }

    public UserResponse updateMyInfo(UserUpdateRequest request) {
        String username = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        userMapper.updateUser(user, request);

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        return userMapper.toUserResponse(userRepository.save(user));
    }

    public void changeMyPassword(ChangePasswordRequest request) {
        if (request == null
                || request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()
                || request.getNewPassword() == null || request.getNewPassword().isBlank()
                || request.getConfirmPassword() == null || request.getConfirmPassword().isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new AppException(ErrorCode.PASSWORD_NOT_MATCH);
        }

        String username = SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new AppException(ErrorCode.CURRENT_PASSWORD_INVALID);
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public UserResponse updateUser(String userId, UserUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        userMapper.updateUser(user, request);

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getRole() != null) {
            user.setRole(resolveRole(request.getRole()));
        }

        return userMapper.toUserResponse(userRepository.save(user));
    }

    public void deleteUser(String userId) {
        if (!userRepository.existsById(userId)) {
            throw new AppException(ErrorCode.USER_NOT_EXISTED);
        }

        List<String> relatedData = getUserRelatedDataLabels(userId);
        if (!relatedData.isEmpty()) {
            throw new AppException(
                    ErrorCode.USER_HAS_RELATED_DATA,
                    "Không thể xóa người dùng này vì đã có dữ liệu: "
                            + String.join(", ", relatedData)
                            + ". Bạn nên khóa tài khoản hoặc xử lý dữ liệu liên quan trước.");
        }

        try {
            userRepository.deleteById(userId);
        } catch (DataIntegrityViolationException exception) {
            throw new AppException(
                    ErrorCode.USER_HAS_RELATED_DATA,
                    "Không thể xóa người dùng này vì đã có dữ liệu liên quan trong hệ thống. "
                            + "Bạn nên khóa tài khoản hoặc xử lý dữ liệu liên quan trước.");
        }
    }

    private List<String> getUserRelatedDataLabels(String userId) {
        List<String> relatedData = new ArrayList<>();

        if (enrollmentRepository.existsByUserId(userId)) {
            relatedData.add("đăng ký học");
        }
        if (lessonProgressRepository.existsByUserId(userId)) {
            relatedData.add("tiến độ học");
        }
        if (quizAttemptRepository.existsByUserId(userId)) {
            relatedData.add("kết quả/lượt làm bài kiểm tra");
        }
        if (paymentRepository.existsByUserId(userId)) {
            relatedData.add("thanh toán");
        }
        if (courseRepository.existsByInstructorId(userId)) {
            relatedData.add("khóa học đang phụ trách");
        }
        if (assignmentSubmissionRepository.existsByStudentIdOrGradedById(userId, userId)) {
            relatedData.add("bài nộp/bài chấm");
        }
        if (discussionTopicRepository.existsByCreatedById(userId)
                || discussionReplyRepository.existsByUserId(userId)) {
            relatedData.add("thảo luận/bình luận");
        }

        return relatedData;
    }

    private String safeText(String value) {
        return value == null ? "" : value.toLowerCase();
    }

    private Role resolveRoleOrDefault(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            return resolveRole("STUDENT");
        }

        return resolveRole(roleName);
    }

    private Role resolveRole(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST);
        }

        return roleRepository.findById(roleName.trim().toUpperCase())
                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_EXISTED));
    }
}
