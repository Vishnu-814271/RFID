package com.RFID.RFID.repository;

import com.RFID.RFID.model.AppNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppNotificationRepository extends JpaRepository<AppNotification, Long> {
    List<AppNotification> findByTargetRolesContainingOrderByCreatedAtDesc(String role);
}
