package com.nt.lms.dto.response;

import java.math.BigDecimal;
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
    String thumbnailUrl;

    String instructorId;
    String instructorName;
    String instructorAvatar;

    String categoryId;
    String categoryName;

    String status;
    String visibility;
    String level;
    Integer estimatedHours;
    BigDecimal price;
    String currency;
    Boolean paid;
    Long enrollmentCount;
}
