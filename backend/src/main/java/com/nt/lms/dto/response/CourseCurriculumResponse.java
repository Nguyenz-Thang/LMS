package com.nt.lms.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CourseCurriculumResponse {
    String id;
    String title;
    String description;
    String thumbnailUrl;
    String instructorName;
    String categoryName;
    List<CurriculumSectionResponse> sections;
}