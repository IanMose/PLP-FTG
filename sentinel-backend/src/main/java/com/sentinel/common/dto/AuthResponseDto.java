package com.sentinel.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponseDto {
    private String token;
    private String name;
    private String email;
    private String role;
    private Long userId;
}
