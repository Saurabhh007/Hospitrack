package com.hospitrack;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@SpringBootApplication
@EnableTransactionManagement
@EnableAsync
public class HospitrackApplication {

    public static void main(String[] args) {
        SpringApplication.run(HospitrackApplication.class, args);
    }
}
