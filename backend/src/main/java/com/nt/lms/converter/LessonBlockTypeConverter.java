package com.nt.lms.converter;

import com.nt.lms.enums.LessonBlockType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class LessonBlockTypeConverter implements AttributeConverter<LessonBlockType, String> {

    @Override
    public String convertToDatabaseColumn(LessonBlockType attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public LessonBlockType convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return LessonBlockType.UNKNOWN;
        }

        try {
            return LessonBlockType.valueOf(dbData.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return LessonBlockType.UNKNOWN;
        }
    }
}
