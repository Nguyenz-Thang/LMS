package com.nt.lms.configuration;

import com.nt.lms.entity.User;
import com.nt.lms.exception.AppException;
import com.nt.lms.exception.ErrorCode;
import com.nt.lms.repository.RoleRepository;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.nt.lms.repository.UserRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Configuration
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class ApplicationInitConfig {
    PasswordEncoder passwordEncoder;

    @Bean
    ApplicationRunner applicationRunner(
            UserRepository userRepository,
            RoleRepository roleRepository,
            JdbcTemplate jdbcTemplate
    ) {
        return args -> {
            seedSystemRoles(roleRepository);
            migrateLegacyUserRoles(jdbcTemplate);

            if (userRepository.findByUsername("adminn").isEmpty() && userRepository.findByEmail("admin@gmail.com").isEmpty()) {
                var role = roleRepository.findById("ADMIN")
                        .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_EXISTED));
                User user = User.builder()
                        .username("adminn")
                        .password(passwordEncoder.encode("admin"))
                        .email("admin@gmail.com")
                        .role(role)
                        .build();

                userRepository.save(user);
                log.warn("admin user has been created with default password: admin, please change it");
            }

            userRepository.findByUsername("adminn")
                    .filter(user -> user.getRole() == null)
                    .ifPresent(user -> {
                        var role = roleRepository.findById("ADMIN")
                                .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_EXISTED));
                        user.setRole(role);
                        userRepository.save(user);
                    });
        };
    }

    private void seedSystemRoles(RoleRepository roleRepository) {
        Map<String, String> roles = new LinkedHashMap<>();
        roles.put("ADMIN", "System administrator");
        roles.put("INSTRUCTOR", "Instructor");
        roles.put("STUDENT", "Student");

        roles.forEach((name, description) -> roleRepository.findById(name)
                .orElseGet(() -> {
                    com.nt.lms.entity.Role role = com.nt.lms.entity.Role.builder()
                            .name(name)
                            .description(description)
                            .build();

                    log.info("Seeded missing system role: {}", name);
                    return roleRepository.save(role);
                }));
    }

    private void migrateLegacyUserRoles(JdbcTemplate jdbcTemplate) {
        try {
            int updated = jdbcTemplate.update("""
                    UPDATE users u
                    JOIN (
                        SELECT
                            user_id,
                            COALESCE(
                                MAX(CASE WHEN role_name = 'ADMIN' THEN 'ADMIN' END),
                                MAX(CASE WHEN role_name = 'INSTRUCTOR' THEN 'INSTRUCTOR' END),
                                MAX(CASE WHEN role_name = 'STUDENT' THEN 'STUDENT' END),
                                MIN(role_name)
                            ) AS role_name
                        FROM user_roles
                        GROUP BY user_id
                    ) ur ON ur.user_id = u.id
                    SET u.role_name = ur.role_name
                    WHERE u.role_name IS NULL
                    """);

            if (updated > 0) {
                log.info("Migrated {} legacy user role assignments to users.role_name", updated);
            }
        } catch (DataAccessException exception) {
            log.info("No legacy user_roles migration was applied: {}", exception.getMessage());
        }
    }
}
