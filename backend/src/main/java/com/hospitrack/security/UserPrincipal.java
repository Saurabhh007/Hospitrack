package com.hospitrack.security;

import com.hospitrack.entity.AccountStatus;
import com.hospitrack.entity.Role;
import com.hospitrack.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

public class UserPrincipal implements UserDetails {

    private final String id;
    private final String name;
    private final String email;
    private final String password;
    private final Role role;
    private final AccountStatus status;
    private final boolean emailVerified;
    private final String hospitalId;
    private final String doctorId;
    private final String patientId;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(String id, String name, String email, String password, Role role, AccountStatus status, boolean emailVerified, String hospitalId, String doctorId, String patientId, Collection<? extends GrantedAuthority> authorities) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password;
        this.role = role;
        this.status = status;
        this.emailVerified = emailVerified;
        this.hospitalId = hospitalId;
        this.doctorId = doctorId;
        this.patientId = patientId;
        this.authorities = authorities;
    }

    public static UserPrincipal create(User user) {
        SimpleGrantedAuthority authority = new SimpleGrantedAuthority(user.getRole().getAuthority());
        return new UserPrincipal(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPasswordHash(),
                user.getRole(),
                user.getStatus(),
                user.isEmailVerified(),
                user.getHospitalId(),
                user.getDoctorId(),
                user.getPatientId(),
                Collections.singletonList(authority)
        );
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public Role getRole() { return role; }
    public AccountStatus getStatus() { return status; }
    public boolean isEmailVerified() { return emailVerified; }
    public String getHospitalId() { return hospitalId; }
    public String getDoctorId() { return doctorId; }
    public String getPatientId() { return patientId; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }

    @Override
    public String getPassword() { return password; }

    @Override
    public String getUsername() { return email; }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return status != AccountStatus.SUSPENDED; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return status != AccountStatus.DISABLED; }
}
