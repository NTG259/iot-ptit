package com.iot.backend.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/** Stable pagination shape for the frontend tables (Spring's Page JSON is not a stable contract). */
public record PageResponse<T>(List<T> items, int page, int size, long totalItems, int totalPages) {

    public static <T> PageResponse<T> of(Page<T> page) {
        return new PageResponse<>(page.getContent(), page.getNumber() + 1, page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
