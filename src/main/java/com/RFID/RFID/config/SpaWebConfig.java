package com.RFID.RFID.config;

import org.springframework.boot.autoconfigure.web.servlet.error.ErrorViewResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.servlet.ModelAndView;

import java.util.Collections;

@Configuration
public class SpaWebConfig {

    @Bean
    public ErrorViewResolver customErrorViewResolver() {
        return (request, status, model) -> {
            if (status == HttpStatus.NOT_FOUND) {
                String uri = request.getRequestURI();
                // If it's an API request, let Spring handle the 404 naturally
                if (uri != null && uri.startsWith("/api/")) {
                    return null; 
                }
                // Otherwise, it's a frontend route, return index.html for React Router
                return new ModelAndView("forward:/index.html", Collections.emptyMap(), HttpStatus.OK);
            }
            return null;
        };
    }
}
