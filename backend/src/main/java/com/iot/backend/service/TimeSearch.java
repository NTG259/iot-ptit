package com.iot.backend.service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/** Utilities for storing and searching datetime values as Vietnam-time strings. */
public final class TimeSearch {

    static final ZoneOffset VN = ZoneOffset.ofHours(7);
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private TimeSearch() {}

    /** Formats an Instant as a Vietnam-time string {@code "yyyy-MM-dd HH:mm:ss"}. */
    public static String format(Instant instant) {
        return LocalDateTime.ofInstant(instant, VN).format(FMT);
    }

    /**
     * Converts a user search string to a SQL LIKE pattern with a trailing {@code %}.
     * Only digits, {@code -}, {@code :}, and space are allowed (datetime characters).
     * Returns {@code null} when the input is blank or contains other characters.
     */
    public static String toLikePattern(String text) {
        if (text == null || text.isBlank()) return null;
        String t = text.trim();
        for (char c : t.toCharArray()) {
            if (c != '-' && c != ':' && c != ' ' && (c < '0' || c > '9')) return null;
        }
        return t + "%";
    }
}
