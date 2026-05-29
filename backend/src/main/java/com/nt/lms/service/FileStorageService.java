package com.nt.lms.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path root = Paths.get("uploads/courses");

    public String store(MultipartFile file) {
        return store(file, root);
    }

    public String store(MultipartFile file, String uploadDirectory) {
        return store(file, Paths.get(uploadDirectory));
    }

    public void deleteByPublicUrl(String publicUrl) {
        if (publicUrl == null || !publicUrl.startsWith("/uploads/")) {
            return;
        }

        try {
            Path uploadRoot = Paths.get("uploads").toAbsolutePath().normalize();
            Path target = Paths.get(publicUrl.substring("/uploads/".length())).normalize();
            Path resolvedTarget = uploadRoot.resolve(target).normalize();

            if (resolvedTarget.startsWith(uploadRoot)) {
                Files.deleteIfExists(resolvedTarget);
            }
        } catch (IOException ignored) {
        }
    }

    private String store(MultipartFile file, Path uploadDirectory) {
        try {
            if (Files.notExists(uploadDirectory)) {
                Files.createDirectories(uploadDirectory);
            }

            String originalName = file.getOriginalFilename();
            String extension = "";

            if (originalName != null && originalName.contains(".")) {
                extension = originalName.substring(originalName.lastIndexOf("."));
            }

            String fileName = UUID.randomUUID() + extension;

            Files.copy(file.getInputStream(), uploadDirectory.resolve(fileName), StandardCopyOption.REPLACE_EXISTING);

            return fileName;
        } catch (Exception e) {
            throw new RuntimeException("Upload file thất bại", e);
        }
    }
}
