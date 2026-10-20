package com.iot.backend.service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses a search-box entry as a date/time pattern with wildcard support.
 * Each component may be a specific number or {@code *} (= match any value).
 *
 * <p>Accepted formats (Vietnam time, UTC+7):
 * <ul>
 *   <li>{@code yyyy-MM-dd} — e.g. {@code 2026-10-20}, {@code *-12-30}, {@code 2026-*-*}</li>
 *   <li>{@code yyyy-MM-dd HH:mm} — e.g. {@code 2026-*-* 17:*}</li>
 *   <li>{@code yyyy-MM-dd HH:mm:ss} — full pattern</li>
 *   <li>{@code HH:mm} or {@code HH:mm:ss} — time-of-day only, e.g. {@code 17:20}, {@code *:20:*}</li>
 * </ul>
 * A {@code null} component in the result means "no filter on this component".
 */
public final class TimeSearch {

    // yyyy-MM-dd optionally followed by HH:mm:ss; each part is digits or *
    private static final Pattern DATETIME = Pattern.compile(
            "(\\d{4}|\\*)-(\\d{1,2}|\\*)-(\\d{1,2}|\\*)(?:[ T](\\d{1,2}|\\*)(?::(\\d{1,2}|\\*)(?::(\\d{1,2}|\\*))?)?)?");

    // HH:mm optionally :ss; each part is digits or *
    private static final Pattern TIME_OF_DAY = Pattern.compile(
            "(\\d{1,2}|\\*):(\\d{1,2}|\\*)(?::(\\d{1,2}|\\*))?");

    // yyyy-MM or *-MM — partial date without day
    private static final Pattern YEAR_MONTH = Pattern.compile("(\\d{4}|\\*)-(\\d{1,2}|\\*)");

    // yyyy alone
    private static final Pattern YEAR_ONLY = Pattern.compile("(\\d{4}|\\*)");

    private TimeSearch() {}

    /** Parsed time filter — null field = wildcard (no filter on that component). */
    public record TimeFilter(
            Integer year, Integer month, Integer day,
            Integer hour, Integer minute, Integer second) {
        boolean isEmpty() {
            return year == null && month == null && day == null
                    && hour == null && minute == null && second == null;
        }
    }

    /**
     * Parses {@code text} into a {@link TimeFilter}.
     * Returns {@code null} when the text is not a recognisable time pattern or all components are wildcards.
     */
    public static TimeFilter parse(String text) {
        if (text == null || text.isBlank()) return null;
        String t = text.trim();

        Matcher dm = DATETIME.matcher(t);
        if (dm.matches()) {
            Integer year = num(dm.group(1)), month  = num(dm.group(2)), day    = num(dm.group(3));
            Integer hour = num(dm.group(4)), minute = num(dm.group(5)), second = num(dm.group(6));
            if (!valid(month, 1, 12) || !valid(day, 1, 31)
                    || !valid(hour, 0, 23) || !valid(minute, 0, 59) || !valid(second, 0, 59)) return null;
            TimeFilter tf = new TimeFilter(year, month, day, hour, minute, second);
            return tf.isEmpty() ? null : tf;
        }

        Matcher tm = TIME_OF_DAY.matcher(t);
        if (tm.matches()) {
            Integer hour = num(tm.group(1)), minute = num(tm.group(2)), second = num(tm.group(3));
            if (!valid(hour, 0, 23) || !valid(minute, 0, 59) || !valid(second, 0, 59)) return null;
            TimeFilter tf = new TimeFilter(null, null, null, hour, minute, second);
            return tf.isEmpty() ? null : tf;
        }

        Matcher ym = YEAR_MONTH.matcher(t);
        if (ym.matches()) {
            Integer year = num(ym.group(1)), month = num(ym.group(2));
            if (!valid(month, 1, 12)) return null;
            TimeFilter tf = new TimeFilter(year, month, null, null, null, null);
            return tf.isEmpty() ? null : tf;
        }

        Matcher yo = YEAR_ONLY.matcher(t);
        if (yo.matches()) {
            Integer year = num(yo.group(1));
            TimeFilter tf = new TimeFilter(year, null, null, null, null, null);
            return tf.isEmpty() ? null : tf;
        }

        return null;
    }

    /** {@code null} if group is null or {@code "*"}, otherwise parsed as integer. */
    private static Integer num(String s) {
        return (s == null || s.equals("*")) ? null : Integer.parseInt(s);
    }

    /** {@code null} value always passes (wildcard); a non-null value must be in [{@code lo}, {@code hi}]. */
    private static boolean valid(Integer v, int lo, int hi) {
        return v == null || (v >= lo && v <= hi);
    }
}
