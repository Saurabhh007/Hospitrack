package com.hospitrack.security;

import com.hospitrack.entity.User;
import com.hospitrack.repository.UserRepository;
import com.hospitrack.service.UserLookupService;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserLookupService userLookupService;

    public CustomUserDetailsService(UserRepository userRepository, UserLookupService userLookupService) {
        this.userRepository = userRepository;
        this.userLookupService = userLookupService;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        if (identifier == null || identifier.trim().isEmpty()) {
            throw new UsernameNotFoundException("Identifier cannot be empty");
        }
        String idClean = identifier.trim();
        User user = userLookupService.findByIdentifier(idClean)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with identifier: " + identifier));
        return UserPrincipal.create(user);
    }

    @Transactional(readOnly = true)
    public UserDetails loadUserById(String id) {
        if (id == null || id.trim().isEmpty()) {
            throw new UsernameNotFoundException("User ID cannot be empty");
        }
        User user = userRepository.findById(java.util.Objects.requireNonNull(id.trim()))
                .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + id));
        return UserPrincipal.create(user);
    }
}
