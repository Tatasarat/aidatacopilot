const LOCALES = { INR: 'en-IN', USD: 'en-US', GBP: 'en-GB', EUR: 'de-DE' };

const SYMBOLS = { INR: '₹', USD: '$', GBP: '£', EUR: '€' };

/** Short axis labels. Indian compact notation prints thousands as "T", which reads as trillions, so we spell it out ourselves. */
function compactMoney(value, currency) {
  const sign = value < 0 ? '−' : '';
  const abs = Math.abs(value);
  const sym = SYMBOLS[currency] || '';
  const trim = (n) => String(Math.round(n * 10) / 10).replace(/\.0$/, '');
  if (currency === 'INR') {
    if (abs >= 1e7) return `${sign}${sym}${trim(abs / 1e7)}Cr`;
    if (abs >= 1e5) return `${sign}${sym}${trim(abs / 1e5)}L`;
    if (abs >= 1e3) return `${sign}${sym}${trim(abs / 1e3)}k`;
    return `${sign}${sym}${Math.round(abs)}`;
  }
  if (abs >= 1e9) return `${sign}${sym}${trim(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}${sym}${trim(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}${sym}${trim(abs / 1e3)}k`;
  return `${sign}${sym}${Math.round(abs)}`;
}

export function money(value, currency = 'INR', { compact = false } = {}) {
  if (value == null || Number.isNaN(value)) return '–';
  if (compact) return compactMoney(value, currency);
  return new Intl.NumberFormat(LOCALES[currency] || 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export const int = (v) => (v == null ? '–' : new Intl.NumberFormat('en-IN').format(v));
export const percent = (v) => (v == null ? '–' : `${v}%`);
export const decimal = (v) => (v == null ? '–' : String(v));

export function shortDate(iso) {
  if (!iso) return '–';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function longDate(iso) {
  if (!iso) return '–';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Formats a table/tape cell by the column type the server sent. */
export function formatCell(value, type, currency, row) {
  if (type === 'auto' && row && row.type) type = row.type;
  switch (type) {
    case 'money': return money(value, currency);
    case 'int': return int(value);
    case 'percent': return percent(value);
    case 'decimal': return decimal(value);
    case 'days': return value == null ? '–' : `${value} d`;
    case 'date': return shortDate(value);
    default: return value == null ? '–' : String(value);
  }
}

export function changeText(pct) {
  if (pct == null) return null;
  if (pct === 0) return 'no change';
  return `${pct > 0 ? '+' : ''}${pct}%`;
}
