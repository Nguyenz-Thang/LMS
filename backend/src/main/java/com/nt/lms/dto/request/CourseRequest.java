package com.nt.lms.dto.request;

import java.math.BigDecimal;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CourseRequest {
    String title;
    String description;
    String thumbnailUrl;
    String categoryId;

    // theo DB mới
    String status;          // DRAFT, PENDING_APPROVAL, PUBLISHED, REJECTED, ARCHIVED
    String visibility;      // PUBLIC, PRIVATE, UNLISTED
    String level;           // BEGINNER, INTERMEDIATE, ADVANCED
    Integer estimatedHours;
    BigDecimal price;
    String currency;
    Boolean paid;
}
