package com.iot.backend.dto;

import com.iot.backend.entity.User;

public record UserResponse(
        Long id,
        String username,
        String fullName,
        String email,
        String studentId,
        String role,
        String school,
        String githubUrl,
        String figmaUrl
) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getUsername(), user.getFullName(), user.getEmail(),
                user.getStudentId(), user.getRole(), user.getSchool(), user.getGithubUrl(), user.getFigmaUrl());
    }
}
