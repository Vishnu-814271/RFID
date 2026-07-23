package com.RFID.RFID;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.util.TimeZone;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
public class RfidApplication {

	public static void main(String[] args) {
		// Force JVM timezone to IST so all LocalDateTime.now() calls capture IST
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Kolkata"));
		SpringApplication.run(RfidApplication.class, args);
	}

}
