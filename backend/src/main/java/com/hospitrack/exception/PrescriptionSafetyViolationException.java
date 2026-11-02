package com.hospitrack.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public class PrescriptionSafetyViolationException extends RuntimeException {
    public PrescriptionSafetyViolationException(String message) {
        super(message);
    }
}
