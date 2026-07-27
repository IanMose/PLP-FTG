package com.sentinel.common.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuthResponseDto {
    private String token;
    private String name;
    private String email;
    private String role;
    private Long userId;
}
