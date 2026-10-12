'use strict';
// All dates in the analytics layer are plain "YYYY-MM-DD" strings, so there are no time-zone surprises.

function toDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const fmt = (d) => d.toISOString().slice(0, 10);

function addDays(iso, n) {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
}

/** Whole days from a to b (b - a). */
function diffDays(a, b) {
  return Math.round((toDate(b) - toDate(a)) / 86400000);
}

const startOfMonth = (iso) => `${iso.slice(0, 8)}01`;

function endOfMonth(iso) {
  const [y, m] = iso.split('-').map(Number);
  return fmt(new Date(Date.UTC(y, m, 0)));
}

function isValidParts(y, m, d) {
  if (y < 2000 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const pad = (n) => String(n).padStart(2, '0');

/**
 * Accepts 2026-03-31, 2026/03/31, 2026-03-31T10:22:11Z, 31/03/2026 and 31-03-2026 (day first).
 * Returns "YYYY-MM-DD" or null.
 */
function normalizeDate(input) {
  if (input == null) return null;
  const s = String(input).trim();
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return isValidParts(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[T\s].*)?$/);
  if (m) {
    const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return isValidParts(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  return null;
}

function shortLabel(iso) {
  return toDate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

module.exports = { toDate, addDays, diffDays, startOfMonth, endOfMonth, normalizeDate, shortLabel };
