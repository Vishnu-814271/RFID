package com.RFID.RFID;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
public class RfidApplication {

	public static void main(String[] args) {
		SpringApplication.run(RfidApplication.class, args);
	}

}
