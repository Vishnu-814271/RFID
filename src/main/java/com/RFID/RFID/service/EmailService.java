package com.RFID.RFID.service;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:vishnuchityala.ai@gmail.com}")
    private String fromEmail;

    @Value("${app.support.email:support@zencube.com}")
    private String supportEmail;

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

    /**
     * Sends a rich HTML email with inline ZenV logo and fallback plain text.
     */
    public void sendHtmlEmail(String to, String subject, String htmlBody, String plainBody) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, MimeMessageHelper.MULTIPART_MODE_RELATED, "UTF-8");

            if (fromEmail != null && !fromEmail.trim().isEmpty()) {
                try {
                    helper.setFrom(fromEmail.trim(), "ZenCube Team");
                } catch (Exception e) {
                    helper.setFrom(fromEmail.trim());
                }
            }
            helper.setTo(to.trim());
            helper.setSubject(subject);

            // Set both plain text fallback and HTML body
            helper.setText(plainBody, htmlBody);

            // Try to embed ZenV Logo from static resources if referenced in HTML as cid:zenv-logo
            try {
                ClassPathResource logoResource = new ClassPathResource("static/zenv-quantum-logo.png");
                if (logoResource.exists()) {
                    helper.addInline("zenv-logo", logoResource, "image/png");
                }
            } catch (Exception ex) {
                System.out.println("[EMAIL INFO] Inline logo attachment skipped: " + ex.getMessage());
            }

            mailSender.send(mimeMessage);
            System.out.println("Real HTML email successfully sent to: " + to);
        } catch (Exception e) {
            System.err.println("Failed to send real HTML email to " + to + ". Error: " + e.getMessage());
            // Attempt simple plain text email fallback
            try {
                System.out.println("Attempting fallback plain-text email...");
                sendEmail(to, subject, plainBody);
            } catch (Exception fallbackErr) {
                System.err.println("Fallback email also failed: " + fallbackErr.getMessage());
            }
        }
    }

    /**
     * Sends password reset email formatted as requested with ZenV branding.
     */
    public void sendPasswordResetEmail(String to, String candidateName, String adminOrManagerName, String role, String resetPasswordLinkOrCode, int expiryMinutes) {
        String name = (candidateName != null && !candidateName.trim().isEmpty()) ? candidateName.trim() : to;
        String issuer = (adminOrManagerName != null && !adminOrManagerName.trim().isEmpty()) ? adminOrManagerName.trim() : "System Administrator";
        String issuerRole = (role != null && !role.trim().isEmpty()) ? role.trim() : "Admin";
        String expiry = String.valueOf(expiryMinutes);
        String support = (supportEmail != null && !supportEmail.trim().isEmpty()) ? supportEmail : "support@zencube.com";

        String subject = "ZenCube Account Password Reset";

        // Plain Text Fallback
        String plainText = "Hi " + name + ",\n\n"
                + "Your ZenCube account password has been reset by " + issuer + " (" + issuerRole + ").\n\n"
                + "For security reasons, please use the link/credentials below to set a new password:\n\n"
                + "Set New Password: " + resetPasswordLinkOrCode + "\n\n"
                + "This link will expire in " + expiry + " minutes.\n\n"
                + "If you were not expecting this password reset, please contact your administrator or ZenCube support immediately.\n\n"
                + "Regards,\n"
                + "ZenCube Team\n"
                + support + "\n\n"
                + "[ZenV Quantum]";

        // Professional HTML Template
        String htmlContent = "<!DOCTYPE html>\n"
                + "<html lang=\"en\">\n"
                + "<head>\n"
                + "  <meta charset=\"UTF-8\" />\n"
                + "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n"
                + "</head>\n"
                + "<body style=\"margin: 0; padding: 24px; background-color: #0d1527; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;\">\n"
                + "  <table width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\">\n"
                + "    <tr>\n"
                + "      <td align=\"center\">\n"
                + "        <table width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);\">\n"
                + "          <!-- Header Accent -->\n"
                + "          <tr>\n"
                + "            <td style=\"background: linear-gradient(135deg, #0284c7 0%, #0f172a 100%); padding: 28px 32px; text-align: left;\">\n"
                + "              <h2 style=\"margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;\">ZenCube AccessTrack</h2>\n"
                + "            </td>\n"
                + "          </tr>\n"
                + "          <!-- Body Content -->\n"
                + "          <tr>\n"
                + "            <td style=\"padding: 32px 32px 24px 32px;\">\n"
                + "              <p style=\"font-size: 16px; margin: 0 0 16px 0; color: #0f172a;\">Hi <strong>" + escapeHtml(name) + "</strong>,</p>\n"
                + "              <p style=\"font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;\">\n"
                + "                Your ZenCube account password has been reset by <strong>" + escapeHtml(issuer) + " (" + escapeHtml(issuerRole) + ")</strong>.\n"
                + "              </p>\n"
                + "              <p style=\"font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;\">\n"
                + "                For security reasons, please use the link or credentials below to set a new password:\n"
                + "              </p>\n"
                + "              <!-- Password / Link Box -->\n"
                + "              <div style=\"background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 20px 0;\">\n"
                + "                <div style=\"font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 6px;\">Set New Password / Temporary Access Key</div>\n"
                + "                <div style=\"font-size: 18px; font-family: monospace; font-weight: 700; color: #0284c7; letter-spacing: 1px;\">" + escapeHtml(resetPasswordLinkOrCode) + "</div>\n"
                + "              </div>\n"
                + "              <p style=\"font-size: 13px; color: #64748b; margin: 0 0 20px 0;\">\n"
                + "                ⏱️ This link will expire in <strong>" + escapeHtml(expiry) + " minutes</strong>.\n"
                + "              </p>\n"
                + "              <!-- Warning Box -->\n"
                + "              <div style=\"background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px; padding: 12px 16px; margin: 20px 0;\">\n"
                + "                <p style=\"margin: 0; font-size: 13px; color: #991b1b; line-height: 1.5;\">\n"
                + "                  If you were not expecting this password reset, please contact your administrator or ZenCube support immediately.\n"
                + "                </p>\n"
                + "              </div>\n"
                + "              <!-- Regards & Signature -->\n"
                + "              <div style=\"margin-top: 28px; border-top: 1px solid #f1f5f9; padding-top: 20px;\">\n"
                + "                <p style=\"margin: 0; font-size: 14px; color: #475569;\">Regards,</p>\n"
                + "                <p style=\"margin: 4px 0 0 0; font-size: 15px; font-weight: 700; color: #0f172a;\">ZenCube Team</p>\n"
                + "                <p style=\"margin: 2px 0 16px 0; font-size: 13px; color: #64748b;\"><a href=\"mailto:" + escapeHtml(support) + "\" style=\"color: #0284c7; text-decoration: none;\">" + escapeHtml(support) + "</a></p>\n"
                + "                <!-- ZenV Logo -->\n"
                + "                <div>\n"
                + "                  <img src=\"cid:zenv-logo\" alt=\"ZENV\" style=\"max-height: 38px; width: auto; display: block;\" />\n"
                + "                </div>\n"
                + "              </div>\n"
                + "            </td>\n"
                + "          </tr>\n"
                + "        </table>\n"
                + "      </td>\n"
                + "    </tr>\n"
                + "  </table>\n"
                + "</body>\n"
                + "</html>";

        sendHtmlEmail(to, subject, htmlContent, plainText);
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}

