package com.nt.lms.controller;

import com.nt.lms.dto.response.ApiResponse;
import com.nt.lms.service.FileStorageService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/courses")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UploadController {
    FileStorageService fileStorageService;
    @PostMapping("/upload")
    public ApiResponse<String> uploadThumbnail(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw new RuntimeException("File rỗng");
        }

        String fileName = fileStorageService.store(file);
        return ApiResponse.<String>builder()
                .result("/uploads/courses/" + fileName)
                .build();
    }
}
