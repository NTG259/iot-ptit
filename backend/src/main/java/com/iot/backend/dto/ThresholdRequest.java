package com.iot.backend.dto;

/** Either bound may be null to leave that side unchecked. */
public record ThresholdRequest(Double minValue, Double maxValue) {
}
