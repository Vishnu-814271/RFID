/**
 * Utility functions for parsing and formatting dates from the backend.
 *
 * The backend emits LocalDateTime values like "2026-07-23T13:02:20.127056" — no
 * timezone suffix. Browsers treat un-suffixed ISO strings ambiguously (Chrome may
 * interpret them as UTC, Safari as local).
 *
 * Our backend always runs in IST (Asia/Kolkata, UTC+5:30), so we append "+05:30"
 * before parsing so every browser treats the timestamp correctly.
 */

/**
 * Parse a backend LocalDateTime string into a JS Date in IST.
 * Handles both naive ("2026-07-23T13:02:20") and already-offset strings.
 */
export function parseIST(dateString) {
  if (!dateString) return null;
  const str = String(dateString);
  // If there's already a timezone offset (Z, +, -) don't add one
  if (/[Z+\-]\d{2}:\d{2}$/.test(str) || str.endsWith('Z')) {
    return new Date(str);
  }
  // Append IST offset so the browser parses it correctly
  return new Date(str + '+05:30');
}

/**
 * Format a backend datetime string as a human-readable time (e.g. "1:02:20 PM").
 */
export function formatTime(dateString, opts = {}) {
  const d = parseIST(dateString);
  if (!d || isNaN(d)) return '-';
  return d.toLocaleTimeString('en-IN', opts);
}

/**
 * Format a backend datetime string as a human-readable date+time.
 */
export function formatDateTime(dateString) {
  const d = parseIST(dateString);
  if (!d || isNaN(d)) return '-';
  return d.toLocaleString('en-IN');
}
