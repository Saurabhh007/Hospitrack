package com.hospitrack.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class PatientEventStreamService {

    private static final Logger logger = LoggerFactory.getLogger(PatientEventStreamService.class);
    private static final long SSE_TIMEOUT = 120_000L; // 2 minutes with heartbeat

    // Map of patientId -> list of active SSE emitters
    private final Map<String, CopyOnWriteArrayList<SseEmitter>> patientEmitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String patientId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);
        patientEmitters.computeIfAbsent(patientId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(patientId, emitter));
        emitter.onTimeout(() -> removeEmitter(patientId, emitter));
        emitter.onError(e -> removeEmitter(patientId, emitter));

        // Send initial connection event
        try {
            emitter.send(SseEmitter.event()
                    .name("CONNECTED")
                    .data(Map.of("message", "Connected Care Real-Time Stream Active", "patientId", patientId)));
        } catch (IOException e) {
            removeEmitter(patientId, emitter);
        }

        return emitter;
    }

    public void emitPatientEvent(String patientId, String eventType, Object eventData) {
        CopyOnWriteArrayList<SseEmitter> emitters = patientEmitters.get(patientId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventType)
                        .data(eventData));
            } catch (Exception e) {
                removeEmitter(patientId, emitter);
            }
        }
    }

    private void removeEmitter(String patientId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> list = patientEmitters.get(patientId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                patientEmitters.remove(patientId);
            }
        }
    }
}
