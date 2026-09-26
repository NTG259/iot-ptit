package com.iot.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record UpdateProfileRequest(
        @NotBlank String fullName,
        @Email String email,
        String studentId,
        String role,
        String school,
        String githubUrl,
        String figmaUrl
) {
}
