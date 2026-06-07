package com.nt.lms.dto.request;

import java.time.LocalDate;

import com.nt.lms.validator.DobConstraint;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserCreationRequest {

    @Size(min = 8, message = "USERNAME_INVALID")
    String username;

    @Email(message = "INVALID_EMAIL")
    String email;

    @Size(min = 6, message = "INVALID_PASSWORD")
    String password;

    String fullName;

    @DobConstraint(min = 2, message = "INVALID_DOB")
    LocalDate dob;

    String role;
}
