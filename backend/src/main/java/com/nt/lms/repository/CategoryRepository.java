package com.nt.lms.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.nt.lms.entity.Category;

public interface CategoryRepository extends JpaRepository<Category, String> {
}