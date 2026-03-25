package com.nt.lms.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SectionResponse {
    String id;
    String title;
    int orderIndex;
    String courseId;
}