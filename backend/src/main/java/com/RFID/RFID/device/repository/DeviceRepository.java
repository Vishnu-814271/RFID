package com.RFID.RFID.device.repository;

import com.RFID.RFID.device.model.RfidDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DeviceRepository extends JpaRepository<RfidDevice, Long> {
    Optional<RfidDevice> findByDeviceKey(String deviceKey);
    Optional<RfidDevice> findByDeviceKeyIgnoreCase(String deviceKey);
}
