package com.nt.lms.controller;

import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.dto.response.PaymentResponse;
import com.nt.lms.service.PaymentService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/courses/{courseId}")
    public ApiResponse<PaymentResponse> createCoursePayment(@PathVariable String courseId) {
        return ApiResponse.<PaymentResponse>builder()
                .result(paymentService.createCoursePayment(courseId))
                .build();
    }

    @GetMapping("/{paymentId}")
    public ApiResponse<PaymentResponse> getPayment(@PathVariable String paymentId) {
        return ApiResponse.<PaymentResponse>builder()
                .result(paymentService.getPayment(paymentId))
                .build();
    }

    @PostMapping("/sepay/webhook")
    public ResponseEntity<Map<String, Object>> sepayWebhook(
            @RequestBody String rawBody,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestHeader(value = "X-SePay-Signature", required = false) String signature,
            @RequestHeader(value = "X-SePay-Timestamp", required = false) String timestamp) {
        paymentService.handleSepayWebhook(rawBody, authorization, signature, timestamp);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
