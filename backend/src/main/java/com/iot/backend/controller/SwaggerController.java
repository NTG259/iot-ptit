package com.iot.backend.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@RestController
public class SwaggerController {

    @GetMapping(value = "/v3/api-docs", produces = "application/yaml")
    public ResponseEntity<String> apiDocs() throws IOException {
        var resource = new ClassPathResource("openapi.yaml");
        String content = resource.getContentAsString(StandardCharsets.UTF_8);
        return ResponseEntity.ok().contentType(MediaType.valueOf("application/yaml")).body(content);
    }
}
