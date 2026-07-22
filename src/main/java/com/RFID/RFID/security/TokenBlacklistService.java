package com.RFID.RFID.security;

import org.springframework.stereotype.Service;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenBlacklistService {
    // In-memory blacklist for invalidated JWTs. In a production scenario with multiple instances, 
    // this would typically be backed by Redis.
    private final Set<String> blacklistedTokens = ConcurrentHashMap.newKeySet();

    public void blacklistToken(String token) {
        if (token != null) {
            blacklistedTokens.add(token);
        }
    }

    public boolean isBlacklisted(String token) {
        return token != null && blacklistedTokens.contains(token);
    }
}
