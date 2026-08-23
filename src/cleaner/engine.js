import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

import { normalizeDate } from './dates.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const FORMULA_PATTERN = /^[=@]/;
const makeIssue = (code, field, message) => ({ code, field, message });
const isBlank = (value) => String(value ?? '').trim() === '';

function addChange(changes, field, before, after, reason) {
  if (before !== after) changes.push({ field, before, after, reason });
}

function normalizePhone(value, defaultCountry) {
  const input = String(value ?? '').trim();
  if (!input) return { value: '', valid: true };
  if (!input.startsWith('+') && !defaultCountry) {
    return { value: input, valid: false, code: 'PHONE_NEEDS_COUNTRY', message: 'Choose a default country or use an international + number.' };
  }
  const phone = parsePhoneNumberFromString(input, defaultCountry || undefined);
  if (!phone || !phone.isValid()) {
    return { value: input, valid: false, code: 'INVALID_PHONE', message: 'This phone number is not valid.' };
  }
  return { value: phone.number, valid: true };
}

export function processRows(rows, config) {
  const {
    headers,
    emailField = '',
    phoneField = '',
    dateField = '',
    requiredFields = [],
    dedupeFields = [],
    defaultCountry = '',
    dateOrder = 'AUTO',
  } = config;

  const prepared = rows.map((sourceRow) => {
    const original = Object.fromEntries(headers.map((header) => [header, String(sourceRow[header] ?? '')]));
    const normalized = { ...original };
    const issues = [];
    const changes = [];

    for (const header of headers) {
      const trimmed = normalized[header].trim();
      addChange(changes, header, normalized[header], trimmed, 'Trimmed surrounding whitespace');
      normalized[header] = trimmed;
      if (FORMULA_PATTERN.test(trimmed)) {
        issues.push(makeIssue('POTENTIAL_FORMULA', header, 'This value begins like a spreadsheet formula and needs review.'));
      }
    }

    for (const field of requiredFields) {
      if (isBlank(normalized[field])) issues.push(makeIssue('MISSING_REQUIRED', field, `${field} is required.`));
    }

    if (emailField && !isBlank(normalized[emailField])) {
      const before = normalized[emailField];
      const after = before.toLowerCase();
      addChange(changes, emailField, before, after, 'Lowercased email');
      normalized[emailField] = after;
      if (!EMAIL_PATTERN.test(after)) issues.push(makeIssue('INVALID_EMAIL', emailField, 'This email address is not valid.'));
    }

    if (phoneField && !isBlank(normalized[phoneField])) {
      const before = normalized[phoneField];
      const phone = normalizePhone(before, defaultCountry);
      if (!phone.valid) issues.push(makeIssue(phone.code, phoneField, phone.message));
      else {
        addChange(changes, phoneField, before, phone.value, 'Normalized phone to international format');
        normalized[phoneField] = phone.value;
      }
    }

    if (dateField && !isBlank(normalized[dateField])) {
      const before = normalized[dateField];
      const date = normalizeDate(before, dateOrder);
      if (!date.valid) issues.push(makeIssue(date.code, dateField, date.message));
      else {
        addChange(changes, dateField, before, date.value, 'Normalized date to YYYY-MM-DD');
        normalized[dateField] = date.value;
      }
    }

    return {
      rowNumber: sourceRow.__rowNumber,
      original,
      normalized,
      issues,
      changes,
      status: issues.length ? 'rejected' : 'pending',
      duplicateOfRow: null,
      duplicateKey: '',
    };
  });

  const seen = new Map();
  for (const row of prepared) {
    if (row.status === 'rejected') continue;
    let duplicate = null;
    for (const field of dedupeFields) {
      const value = String(row.normalized[field] ?? '').trim().toLowerCase();
      if (!value) continue;
      const key = `${field}:${value}`;
      if (seen.has(key)) {
        duplicate = { key, rowNumber: seen.get(key) };
        break;
      }
    }
    if (duplicate) {
      row.status = 'duplicate';
      row.duplicateOfRow = duplicate.rowNumber;
      row.duplicateKey = duplicate.key;
      continue;
    }
    row.status = 'clean';
    for (const field of dedupeFields) {
      const value = String(row.normalized[field] ?? '').trim().toLowerCase();
      if (value) seen.set(`${field}:${value}`, row.rowNumber);
    }
  }

  const clean = prepared.filter((row) => row.status === 'clean');
  const rejected = prepared.filter((row) => row.status === 'rejected');
  const duplicates = prepared.filter((row) => row.status === 'duplicate');
  const changed = clean.filter((row) => row.changes.length > 0);
  return {
    clean,
    rejected,
    duplicates,
    report: prepared,
    summary: { total: prepared.length, clean: clean.length, changed: changed.length, rejected: rejected.length, duplicates: duplicates.length },
  };
}
