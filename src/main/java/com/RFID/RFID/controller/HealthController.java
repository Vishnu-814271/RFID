package com.RFID.RFID.controller;

import com.RFID.RFID.dto.Envelope;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    @GetMapping
    public Envelope getHealth() {
        return Envelope.ok("UP");
    }
}
