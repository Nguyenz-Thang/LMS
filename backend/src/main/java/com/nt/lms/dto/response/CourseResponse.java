package com.nt.lms.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CourseResponse {
    String id;
    String title;
    String description;
    String instructorName;
    String categoryName;
}