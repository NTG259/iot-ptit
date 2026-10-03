package com.iot.backend.service;

import org.springframework.data.jpa.domain.Specification;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Reads a search box entry as a time, shared by the sensor data and action history searches. Times are
 * Vietnam time, the same as the frontend shows; the entity's {@code secondOfDayAttribute} must be a
 * formula giving seconds since Vietnam midnight (see SensorData#secondOfDay).
 */
final class TimeSearch {

    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /** "2026-10-03", "2026-10-03 17", "2026-10-03 17:20" or "2026-10-03 17:20:05" (a space or "T" before the time). */
    private static final Pattern TIME_PREFIX =
            Pattern.compile("(\\d{4})-(\\d{2})-(\\d{2})(?:[ T](\\d{1,2})(?::(\\d{2})(?::(\\d{2}))?)?)?");

    /** A time of day, "17:20" or "17:20:05" (the colon tells it apart from a value such as "17"). */
    private static final Pattern TIME_OF_DAY = Pattern.compile("(\\d{1,2}):(\\d{2})(?::(\\d{2}))?");

    private TimeSearch() {
    }

    /**
     * A filter for {@code text} read as a date/time prefix ("2026-10-03 17:20" means that whole minute) or as a
     * time of day on any date ("17:20", "17:20:05"; combine with a from/to filter for one day), or null when
     * the text is not a valid time, so the caller can fall back to its own text search.
     */
    static <T> Specification<T> matching(String text, String timeAttribute, String secondOfDayAttribute) {
        Instant[] range = parseTimePrefix(text);
        if (range != null) {
            return (root, query, cb) -> cb.and(
                    cb.greaterThanOrEqualTo(root.get(timeAttribute), range[0]),
                    cb.lessThan(root.get(timeAttribute), range[1]));
        }
        long[] seconds = parseTimeOfDay(text);
        if (seconds != null) {
            return (root, query, cb) -> cb.and(
                    cb.greaterThanOrEqualTo(root.get(secondOfDayAttribute), seconds[0]),
                    cb.lessThan(root.get(secondOfDayAttribute), seconds[1]));
        }
        return null;
    }

    /** The span a typed date/time covers, e.g. "2026-10-03 17:20" is [17:20:00, 17:21:00); null if not a time. */
    private static Instant[] parseTimePrefix(String text) {
        Matcher m = TIME_PREFIX.matcher(text);
        if (!m.matches()) {
            return null;
        }
        ChronoUnit unit = m.group(6) != null ? ChronoUnit.SECONDS
                : m.group(5) != null ? ChronoUnit.MINUTES
                : m.group(4) != null ? ChronoUnit.HOURS
                : ChronoUnit.DAYS;
        try {
            LocalDateTime start = LocalDateTime.of(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)),
                    Integer.parseInt(m.group(3)), intOrZero(m.group(4)), intOrZero(m.group(5)), intOrZero(m.group(6)));
            Instant from = start.atZone(ZONE).toInstant();
            return new Instant[] {from, from.plus(1, unit)};
        } catch (DateTimeException e) {
            return null; // e.g. "2026-13-40": the caller's text search then simply finds nothing
        }
    }

    /** "17:20" is [17:20:00, 17:21:00) and "17:20:05" is that one second, in seconds since midnight; null if invalid. */
    private static long[] parseTimeOfDay(String text) {
        Matcher m = TIME_OF_DAY.matcher(text);
        if (!m.matches()) {
            return null;
        }
        int hour = Integer.parseInt(m.group(1));
        int minute = Integer.parseInt(m.group(2));
        int second = intOrZero(m.group(3));
        if (hour > 23 || minute > 59 || second > 59) {
            return null;
        }
        long from = hour * 3600L + minute * 60L + second;
        return new long[] {from, from + (m.group(3) != null ? 1 : 60)};
    }

    private static int intOrZero(String digits) {
        return digits == null ? 0 : Integer.parseInt(digits);
    }
}
