'use strict';
/**
 * Checks that an AI-written explanation only uses numbers that exist in the computed result.
 * If it invents or recalculates anything, we throw the text away and use the template instead.
 */

function addVariants(set, x) {
  const a = Math.abs(x);
  [a, Math.round(a), Math.floor(a), Number(a.toFixed(1)), Number(a.toFixed(2))].forEach((v) => set.add(v));
}

function textNumbers(text) {
  return (String(text).match(/\d[\d,]*(?:\.\d+)?/g) || [])
    .map((s) => Number(s.replace(/,/g, '')))
    .filter(Number.isFinite);
}

function collect(value, set) {
  if (typeof value === 'number' && Number.isFinite(value)) addVariants(set, value);
  else if (typeof value === 'string') textNumbers(value).forEach((n) => addVariants(set, n));
  else if (Array.isArray(value)) value.forEach((v) => collect(v, set));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collect(v, set));
}

function verifyExplanation(text, result) {
  const t = String(text || '').trim();
  if (!t) return { ok: false, reason: 'empty' };
  if (t.length > 900) return { ok: false, reason: 'too long' };
  if (/https?:\/\/|www\./i.test(t)) return { ok: false, reason: 'contains a link' };

  const allowed = new Set();
  collect({ rows: result.rows, facts: result.facts, range: result.range, evidence: result.evidence }, allowed);

  const unknown = textNumbers(t).filter((n) => n >= 10 && !allowed.has(n));
  if (unknown.length) return { ok: false, reason: `numbers not found in the data: ${unknown.slice(0, 3).join(', ')}` };
  return { ok: true };
}

module.exports = { verifyExplanation, textNumbers };
