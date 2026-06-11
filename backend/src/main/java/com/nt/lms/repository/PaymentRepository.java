package com.nt.lms.repository;

import com.nt.lms.entity.Payment;
import com.nt.lms.enums.PaymentStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, String> {
    Optional<Payment> findByPaymentCode(String paymentCode);

    Optional<Payment> findFirstByUserIdAndCourseIdAndStatusOrderByCreatedAtDesc(
            String userId, String courseId, PaymentStatus status);

    List<Payment> findByStatus(PaymentStatus status);

    boolean existsByUserId(String userId);

    boolean existsBySepayTransactionId(String sepayTransactionId);
}
