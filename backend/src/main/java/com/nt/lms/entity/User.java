package com.nt.lms.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Entity
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)

@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @Column(unique = true)
    String username;

    @Column(unique = true)
    String email;

    String password;
    String fullName;
    String avatar;
    LocalDate dob;

    LocalDateTime createdAt;
    LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_name")
    Role role;

    @Transient
    public Set<Role> getRoles() {
        return role == null ? Set.of() : Set.of(role);
    }

    public void setRoles(Set<Role> roles) {
        role = roles == null || roles.isEmpty() ? null : roles.iterator().next();
    }

    @PrePersist
    void prePersist() {
        var now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
