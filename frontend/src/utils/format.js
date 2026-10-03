const pad = (n) => String(n).padStart(2, '0')

// Vietnam time is UTC+7 all year (no daylight saving), so a fixed offset is exact.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000

/** The same instant shifted so its getUTC*() fields read as Vietnam wall-clock time. */
export function inVietnam(date) {
  return new Date(date.getTime() + VN_OFFSET_MS)
}

/**
 * "2025-05-18 14:32:05" in Vietnam time, whatever the browser's own time zone — the one timestamp
 * format used across the tables, and the same format the search box understands.
 */
export function formatDateTime(date) {
  const vn = inVietnam(date)
  return `${vn.getUTCFullYear()}-${pad(vn.getUTCMonth() + 1)}-${pad(vn.getUTCDate())} ${formatTime(date, true)}`
}

/** "14:32" (or "14:32:05" with seconds) in Vietnam time. */
export function formatTime(date, seconds = false) {
  const vn = inVietnam(date)
  const hm = `${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())}`
  return seconds ? `${hm}:${pad(vn.getUTCSeconds())}` : hm
}
