package com.iot.backend.service;

import com.iot.backend.dto.UpdateProfileRequest;
import com.iot.backend.dto.UserResponse;
import com.iot.backend.entity.User;
import com.iot.backend.exception.ResourceNotFoundException;
import com.iot.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public UserResponse getProfile(String username) {
        return UserResponse.from(findUser(username));
    }

    @Transactional
    public UserResponse updateProfile(String username, UpdateProfileRequest request) {
        User user = findUser(username);
        user.setFullName(request.fullName());
        user.setEmail(request.email());
        user.setStudentId(request.studentId());
        user.setRole(request.role());
        user.setSchool(request.school());
        user.setGithubUrl(request.githubUrl());
        user.setFigmaUrl(request.figmaUrl());
        return UserResponse.from(user);
    }

    private User findUser(String username) {
        return userRepository.findByUsername(username).orElseThrow(() -> new ResourceNotFoundException("User", username));
    }
}
