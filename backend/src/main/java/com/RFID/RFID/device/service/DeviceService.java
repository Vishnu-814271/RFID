package com.RFID.RFID.device.service;

import com.RFID.RFID.device.model.RfidDevice;
import com.RFID.RFID.device.repository.DeviceRepository;
import com.RFID.RFID.exception.BadRequestException;
import com.RFID.RFID.exception.ResourceNotFoundException;
import com.RFID.RFID.service.AuditService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final AuditService auditService;

    public DeviceService(DeviceRepository deviceRepository, AuditService auditService) {
        this.deviceRepository = deviceRepository;
        this.auditService = auditService;
    }

    public List<RfidDevice> getAllDevices() {
        return deviceRepository.findAll();
    }

    public RfidDevice getDeviceById(Long id) {
        return deviceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found with ID: " + id));
    }

    @Transactional
    public RfidDevice registerDevice(RfidDevice device) {
        if (device.getDeviceKey() == null || device.getDeviceKey().trim().isEmpty()) {
            throw new BadRequestException("Device key is required.");
        }
        if (deviceRepository.findByDeviceKeyIgnoreCase(device.getDeviceKey().trim()).isPresent()) {
            throw new BadRequestException("Device key already registered: " + device.getDeviceKey());
        }
        device.setLastHeartbeat(LocalDateTime.now());
        RfidDevice saved = deviceRepository.save(device);
        auditService.log("DEVICE_REGISTERED", "DEVICE", saved.getDeviceId().toString());
        return saved;
    }

    @Transactional
    public RfidDevice recordHeartbeat(String deviceKey) {
        RfidDevice device = deviceRepository.findByDeviceKey(deviceKey)
                .orElseThrow(() -> new ResourceNotFoundException("Device not found with key: " + deviceKey));
        device.setLastHeartbeat(LocalDateTime.now());
        device.setStatus("ONLINE");
        return deviceRepository.save(device);
    }
}
