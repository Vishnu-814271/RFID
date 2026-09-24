package com.RFID.RFID.auth.model;

import com.RFID.RFID.model.Role;
import com.RFID.RFID.model.StaffUser;
import jakarta.persistence.Entity;

@Entity
public class User extends StaffUser {

    public User() {
        super();
    }

    public User(String email, String password, Role role, StaffUser addedBy) {
        super(email, password, role, addedBy);
    }
}
