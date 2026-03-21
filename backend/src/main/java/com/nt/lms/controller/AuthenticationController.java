package com.nt.lms.controller;

import java.text.ParseException;

import com.nimbusds.jose.JOSEException;

import com.nt.lms.dto.request.*;
import com.nt.lms.dto.response.*;

import com.nt.lms.service.AuthenticationService;
import com.nt.lms.service.UserService;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthenticationController {

    AuthenticationService authenticationService;
    UserService userService;

    // 🔐 LOGIN
    @PostMapping("/token")
    public ApiResponse<AuthenticationResponse> authenticate(@RequestBody AuthenticatitonRequest request) {
        var result = authenticationService.authenticate(request);
        return ApiResponse.<AuthenticationResponse>builder()
                .result(result)
                .build();
    }

    // 🆕 REGISTER (THÊM MỚI)
    @PostMapping("/register")
    public ApiResponse<UserResponse> register(@RequestBody RegisterRequest request) {
        var result = userService.register(request);
        return ApiResponse.<UserResponse>builder()
                .result(result)
                .build();
    }

    // 🔍 CHECK TOKEN
    @PostMapping("/introspect")
    public ApiResponse<IntrospectResponse> introspect(@RequestBody IntrospectRequest request)
            throws ParseException, JOSEException {

        var result = authenticationService.introspect(request);
        return ApiResponse.<IntrospectResponse>builder()
                .result(result)
                .build();
    }

    // 🔄 REFRESH TOKEN
    @PostMapping("/refresh")
    public ApiResponse<AuthenticationResponse> refresh(@RequestBody RefreshRequest request)
            throws ParseException, JOSEException {

        var result = authenticationService.refreshToken(request);
        return ApiResponse.<AuthenticationResponse>builder()
                .result(result)
                .build();
    }

    // 🚪 LOGOUT
    @PostMapping("/logout")
    public ApiResponse<Void> logout(@RequestBody LogoutRequest request)
            throws ParseException, JOSEException {

        authenticationService.logout(request);
        return ApiResponse.<Void>builder().build();
    }
}