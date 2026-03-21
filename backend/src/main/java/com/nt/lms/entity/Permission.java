package com.nt.lms.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

import jakarta.persistence.ManyToMany;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.Set;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Permission {

    @Id
    String name; // CREATE_COURSE, DELETE_USER,...

    String description;

    @ManyToMany(mappedBy = "permissions")
    Set<Role> roles;
}