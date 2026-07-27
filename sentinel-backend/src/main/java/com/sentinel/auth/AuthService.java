package com.sentinel.auth;

import com.sentinel.common.dto.AuthResponseDto;
import com.sentinel.common.dto.LoginRequestDto;
import com.sentinel.common.security.JwtUtil;
import com.sentinel.user.AppUserEntity;
import com.sentinel.user.AppUserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AuthService {

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(AppUserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @Transactional
    public AuthResponseDto login(LoginRequestDto request) {
        AppUserEntity user = userRepository.findByEmailIgnoreCase(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        if (!"Active".equalsIgnoreCase(user.getStatus())) {
            throw new IllegalStateException("Account is " + user.getStatus() + ". Contact your administrator.");
        }

        // Update last login timestamp
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().getName(), user.getId());

        return AuthResponseDto.builder()
                .token(token)
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().getName())
                .userId(user.getId())
                .build();
    }
}
