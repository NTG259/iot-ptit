package com.iot.backend.dto;

import java.util.List;

/**
 * A sensor's newest readings for the dashboard chart, oldest first. {@code values[i]} was measured at
 * {@code times[i]}, written as "HH:mm:ss" in Vietnam time (empty lists when there are no readings).
 */
public record SensorChartResponse(List<Double> values, List<String> times) {
}
