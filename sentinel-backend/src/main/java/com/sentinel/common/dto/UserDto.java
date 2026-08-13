package com.sentinel.common.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class UserDto {
    private Long id;
    private String name;
    private String email;
    private String role;
    private String status;
    private LocalDateTime joinedAt;
    private LocalDateTime lastLoginAt;
}
