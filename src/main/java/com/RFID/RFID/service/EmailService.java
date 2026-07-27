package com.RFID.RFID.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:vishnuchityala.ai@gmail.com}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (fromEmail != null && !fromEmail.trim().isEmpty()) {
                message.setFrom(fromEmail.trim());
            }
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            System.out.println("Real email successfully sent to: " + to);
        } catch (Exception e) {
            System.err.println("Failed to send real email to " + to + ". Error: " + e.getMessage());
            System.out.println("----- MOCKED EMAIL SENT -----");
            System.out.println("To: " + to);
            System.out.println("Subject: " + subject);
            System.out.println("Body: " + body);
            System.out.println("-----------------------------");
        }
    }
}
