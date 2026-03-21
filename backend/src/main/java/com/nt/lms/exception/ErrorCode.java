package com.nt.lms.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

import lombok.Getter;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategoried error", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(1001, "Invalid message key", HttpStatus.BAD_REQUEST),
    USER_EXISTED(1002, "User existed", HttpStatus.BAD_REQUEST),
    USERNAME_INVALID(1003, "Username must be at least 8 chacracters", HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD(1004, "Password must be at least 6 chacracters", HttpStatus.BAD_REQUEST),
    USER_NOT_EXISTED(1005, "User not existed", HttpStatus.NOT_FOUND),
    UNAUTHENTICATED(1006, "Unauthenticated", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1007, "You do not have Permission", HttpStatus.FORBIDDEN),
    INVALID_DOB(1008, "Invalid date of birth", HttpStatus.BAD_REQUEST),
    ROLE_NOT_EXISTED(1009, "Role not existed", HttpStatus.NOT_FOUND),
    COURSE_NOT_EXISTED(1010, "Course not existed", HttpStatus.NOT_FOUND),
    CATEGORY_NOT_EXISTED(1011, "Category not existed", HttpStatus.NOT_FOUND),
    LESSON_NOT_EXISTED(1012, "Lesson not existed", HttpStatus.NOT_FOUND),
    QUIZ_NOT_EXISTED(1014, "Quiz not existed", HttpStatus.NOT_FOUND),
    ALREADY_ENROLLED(1013, "User already enrolled in this course", HttpStatus.BAD_REQUEST),
    ;

    ErrorCode(int code, String message, HttpStatusCode statusCode) {
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

    private int code;
    private String message;
    private HttpStatusCode statusCode;

    public int getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }
}
