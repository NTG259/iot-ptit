package com.iot.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Account created on first startup when the users table is empty. */
@ConfigurationProperties(prefix = "app.admin")
public record AdminProperties(String username, String password) {
}
