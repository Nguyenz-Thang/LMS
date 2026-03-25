package com.nt.lms.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path root = Paths.get("uploads/courses");

    public String store(MultipartFile file) {
        try {
            if (Files.notExists(root)) {
                Files.createDirectories(root);
            }

            String originalName = file.getOriginalFilename();
            String extension = "";

            if (originalName != null && originalName.contains(".")) {
                extension = originalName.substring(originalName.lastIndexOf("."));
            }

            String fileName = UUID.randomUUID() + extension;

            Files.copy(file.getInputStream(), root.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);

            return fileName;
        } catch (Exception e) {
            throw new RuntimeException("Upload file thất bại", e);
        }
    }
}