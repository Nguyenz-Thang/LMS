package com.nt.lms.repository;

import com.nt.lms.entity.SubmissionFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SubmissionFileRepository extends JpaRepository<SubmissionFile, String> {

    @Query(value = """
            select *
            from submission_files
            where submission_id = :submissionId
            """, nativeQuery = true)
    List<SubmissionFile> findBySubmissionId(@Param("submissionId") String submissionId);

    @Query(value = """
            select *
            from submission_files
            where id = :id
              and submission_id = :submissionId
            """, nativeQuery = true)
    Optional<SubmissionFile> findByIdAndSubmissionId(
            @Param("id") String id,
            @Param("submissionId") String submissionId);
}
