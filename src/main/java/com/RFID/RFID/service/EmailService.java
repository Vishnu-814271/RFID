package com.RFID.RFID.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            // Uses the username configured in application.properties as the sender
            mailSender.send(message);
            System.out.println("Real email successfully sent to: " + to);
        } catch (Exception e) {
            System.err.println("Failed to send real email. Falling back to mock console output. Error: " + e.getMessage());
            System.out.println("----- MOCKED EMAIL SENT -----");
            System.out.println("To: " + to);
            System.out.println("Subject: " + subject);
            System.out.println("Body: " + body);
            System.out.println("-----------------------------");
        }
    }
}
