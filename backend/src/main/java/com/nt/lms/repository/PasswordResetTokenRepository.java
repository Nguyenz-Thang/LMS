package com.nt.lms.repository;

import java.util.List;
import java.util.Optional;

import com.nt.lms.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, String> {
    Optional<PasswordResetToken> findByTokenHashAndUsedFalse(String tokenHash);

    List<PasswordResetToken> findByUserIdAndUsedFalse(String userId);
}
