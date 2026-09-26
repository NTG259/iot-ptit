package com.iot.backend.dto;

/** {@code expiresIn} is in seconds. */
public record LoginResponse(String accessToken, String tokenType, long expiresIn, UserResponse user) {
}
