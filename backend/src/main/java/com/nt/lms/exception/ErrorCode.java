package com.nt.lms.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

import lombok.Getter;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Lỗi chưa được phân loại", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY(1001, "Khóa thông báo không hợp lệ", HttpStatus.BAD_REQUEST),
    USER_EXISTED(1002, "Người dùng đã tồn tại", HttpStatus.CONFLICT),
    USERNAME_INVALID(1003, "Tên đăng nhập phải có ít nhất 8 ký tự", HttpStatus.BAD_REQUEST),
    INVALID_PASSWORD(1004, "Mật khẩu phải có ít nhất 6 ký tự", HttpStatus.BAD_REQUEST),
    USER_NOT_EXISTED(1005, "Người dùng không tồn tại", HttpStatus.NOT_FOUND),
    UNAUTHENTICATED(1006, "Chưa xác thực", HttpStatus.UNAUTHORIZED),
    FORBIDDEN(1018, "Bạn không có quyền truy cập", HttpStatus.FORBIDDEN),
    UNAUTHORIZED(1007, "Bạn không có quyền truy cập", HttpStatus.FORBIDDEN),
    INVALID_DOB(1008, "Ngày sinh không hợp lệ", HttpStatus.BAD_REQUEST),
    ROLE_NOT_EXISTED(1009, "Vai trò không tồn tại", HttpStatus.NOT_FOUND),
    COURSE_NOT_EXISTED(1010, "Khóa học không tồn tại", HttpStatus.NOT_FOUND),
    CATEGORY_NOT_EXISTED(1011, "Danh mục không tồn tại", HttpStatus.NOT_FOUND),
    LESSON_NOT_EXISTED(1012, "Bài học không tồn tại", HttpStatus.NOT_FOUND),
    QUIZ_NOT_EXISTED(1014, "Bài kiểm tra không tồn tại", HttpStatus.NOT_FOUND),
    ALREADY_ENROLLED(1013, "Người dùng đã đăng ký khóa học này", HttpStatus.BAD_REQUEST),
    EMAIL_EXISTED(1019, "Email đã tồn tại", HttpStatus.CONFLICT),
    PASSWORD_NOT_MATCH(1015, "Mật khẩu không khớp", HttpStatus.BAD_REQUEST),
    INVALID_REQUEST(1016, "Yêu cầu không hợp lệ", HttpStatus.BAD_REQUEST),
    CURRENT_PASSWORD_INVALID(1017, "Mật khẩu hiện tại không đúng", HttpStatus.BAD_REQUEST),
    RESET_TOKEN_INVALID(1020, "Liên kết đặt lại mật khẩu không hợp lệ", HttpStatus.BAD_REQUEST),
    RESET_TOKEN_EXPIRED(1021, "Liên kết đặt lại mật khẩu đã hết hạn", HttpStatus.BAD_REQUEST),
    EMAIL_SEND_FAILED(1022, "Không gửi được email đặt lại mật khẩu", HttpStatus.SERVICE_UNAVAILABLE),

    CATEGORY_EXISTED(2001, "Danh mục đã tồn tại", HttpStatus.CONFLICT),
    CATEGORY_NOT_FOUND(2002, "Không tìm thấy danh mục", HttpStatus.NOT_FOUND),
    SECTION_NOT_FOUND(2003, "Không tìm thấy chương học", HttpStatus.NOT_FOUND),
    LESSON_NOT_FOUND(2004, "Không tìm thấy bài học", HttpStatus.NOT_FOUND),
    SECTION_NOT_EXISTED(2005, "Chương học không tồn tại", HttpStatus.NOT_FOUND),
    CATEGORY_IN_USE(2006, "Danh mục đang được sử dụng bởi khóa học", HttpStatus.BAD_REQUEST),
    USER_HAS_RELATED_DATA(2007, "Người dùng này đã có dữ liệu liên quan", HttpStatus.BAD_REQUEST),
    QUIZ_HAS_ATTEMPTS(2008, "Bài kiểm tra này đã có lượt làm", HttpStatus.BAD_REQUEST),
    LESSON_HAS_RELATED_DATA(2009, "Bài học này đã có dữ liệu học tập liên quan", HttpStatus.BAD_REQUEST),
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
