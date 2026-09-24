package com.RFID.RFID.device.controller;

import com.RFID.RFID.device.model.RfidDevice;
import com.RFID.RFID.device.service.DeviceService;
import com.RFID.RFID.dto.Envelope;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/devices")
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
public class DeviceController {

    private final DeviceService deviceService;

    public DeviceController(DeviceService deviceService) {
        this.deviceService = deviceService;
    }

    @GetMapping
    public Envelope listDevices() {
        List<RfidDevice> devices = deviceService.getAllDevices();
        return Envelope.ok(devices);
    }

    @GetMapping("/{id}")
    public Envelope getDevice(@PathVariable Long id) {
        RfidDevice device = deviceService.getDeviceById(id);
        return Envelope.ok(device);
    }

    @PostMapping
    public Envelope registerDevice(@RequestBody RfidDevice device) {
        RfidDevice saved = deviceService.registerDevice(device);
        return Envelope.ok(saved);
    }

    @PostMapping("/{deviceKey}/heartbeat")
    public Envelope heartbeat(@PathVariable String deviceKey) {
        RfidDevice updated = deviceService.recordHeartbeat(deviceKey);
        return Envelope.ok(updated);
    }
}
