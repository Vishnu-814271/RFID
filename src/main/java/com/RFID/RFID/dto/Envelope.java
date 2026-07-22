package com.RFID.RFID.dto;

import java.util.HashMap;
import java.util.Map;

public class Envelope {
    private boolean success;
    private Object data;
    private Object error;

    public Envelope() {}

    public Envelope(boolean success, Object data, Object error) {
        this.success = success;
        this.data = data;
        this.error = error;
    }

    public static Envelope ok(Object data) {
        return new Envelope(true, data, null);
    }

    public static Envelope error(String code, String message) {
        Map<String, String> errMap = new HashMap<>();
        errMap.put("code", code);
        errMap.put("message", message);
        return new Envelope(false, null, errMap);
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public Object getData() {
        return data;
    }

    public void setData(Object data) {
        this.data = data;
    }

    public Object getError() {
        return error;
    }

    public void setError(Object error) {
        this.error = error;
    }
}
