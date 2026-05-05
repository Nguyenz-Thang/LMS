package com.nt.lms.repository;

import com.nt.lms.entity.SubmissionFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubmissionFileRepository extends JpaRepository<SubmissionFile, String> {

    List<SubmissionFile> findBySubmissionId(String submissionId);

    Optional<SubmissionFile> findByIdAndSubmissionId(String id, String submissionId);
}