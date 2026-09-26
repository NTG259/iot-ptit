package com.iot.backend.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "users")
public class User extends BaseEntity {

    private String username;
    private String passwordHash;
    private String fullName;
    private String email;
    private String studentId;
    private String role;
    private String school;
    private String githubUrl;
    private String figmaUrl;
}
