import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { normalizeDate } from '../src/cleaner/dates.js';
import { processRows } from '../src/cleaner/engine.js';
import { createExportBundle } from '../src/cleaner/export.js';
import { parseCsvText } from '../src/cleaner/parse.js';

const fixture = (name) => readFileSync(resolve(import.meta.dirname, 'fixtures', name), 'utf8');
const baseConfig = (headers) => ({
  headers,
  emailField: 'Email',
  phoneField: 'Phone',
  dateField: 'Signup Date',
  requiredFields: ['First Name', 'Email'],
  dedupeFields: ['Email', 'Phone'],
  defaultCountry: 'MY',
  dateOrder: 'DMY',
});

describe('CSV parsing', () => {
  it('preserves quoted commas, line breaks, unicode, and emoji', () => {
    const parsed = parseCsvText(fixture('csv-edge-cases.csv'));
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(3);
    expect(parsed.rows[0].Name).toBe('Tan, Maya');
    expect(parsed.rows[0].Notes).toContain('second line\ninside');
    expect(parsed.rows[1].Name).toBe('李明');
    expect(parsed.rows[2].Notes).toBe('Ready ✅');
  });
});

describe('date normalization', () => {
  it('normalizes deterministic dates and rejects ambiguous auto dates', () => {
    expect(normalizeDate('2026/8/3')).toMatchObject({ valid: true, value: '2026-08-03' });
    expect(normalizeDate('23/08/2026', 'AUTO')).toMatchObject({ valid: true, value: '2026-08-23' });
    expect(normalizeDate('08/09/2026', 'AUTO')).toMatchObject({ valid: false, code: 'AMBIGUOUS_DATE' });
    expect(normalizeDate('31/02/2026', 'DMY')).toMatchObject({ valid: false, code: 'INVALID_DATE' });
  });
});

describe('preflight engine', () => {
  it('normalizes valid rows and separates exact duplicates', () => {
    const parsed = parseCsvText(fixture('duplicate-contacts.csv'));
    const result = processRows(parsed.rows, baseConfig(parsed.headers));
    expect(result.summary).toEqual({ total: 4, clean: 3, changed: 3, rejected: 0, duplicates: 1 });
    expect(result.clean[0].normalized.Email).toBe('maya@north.co');
    expect(result.clean[0].normalized.Phone).toBe('+60128840931');
    expect(result.duplicates[0].duplicateOfRow).toBe(2);
  });

  it('separates missing required fields from clean rows', () => {
    const parsed = parseCsvText(fixture('missing-required.csv'));
    const result = processRows(parsed.rows, baseConfig(parsed.headers));
    expect(result.summary.clean).toBe(1);
    expect(result.summary.rejected).toBe(2);
    expect(result.rejected.map((row) => row.issues[0].code)).toEqual(['MISSING_REQUIRED', 'MISSING_REQUIRED']);
  });

  it('reports invalid formats without guessing', () => {
    const parsed = parseCsvText(fixture('mixed-formats.csv'));
    const result = processRows(parsed.rows, baseConfig(parsed.headers));
    expect(result.summary.rejected).toBe(1);
    expect(result.report[2].issues.map((item) => item.code)).toContain('INVALID_EMAIL');
    expect(result.report[2].issues.map((item) => item.code)).toContain('INVALID_PHONE');
  });

  it('produces all four safe export files', () => {
    const parsed = parseCsvText(fixture('missing-required.csv'));
    const result = processRows(parsed.rows, baseConfig(parsed.headers));
    const bundle = createExportBundle(result, parsed.headers);
    expect(Object.keys(bundle)).toEqual(['clean.csv', 'rejected.csv', 'duplicates.csv', 'preflight-report.csv']);
    expect(bundle['clean.csv']).toContain('lee@example.com');
    expect(bundle['rejected.csv']).toContain('MISSING_REQUIRED');
    expect(bundle['preflight-report.csv']).toContain('source_row');
  });

  it('rejects spreadsheet-formula values and escapes them in exports', () => {
    const parsed = parseCsvText('Name,Email\n=2+2,safe@example.com');
    const result = processRows(parsed.rows, {
      headers: parsed.headers,
      emailField: 'Email',
      requiredFields: ['Name', 'Email'],
      dedupeFields: ['Email'],
    });
    const bundle = createExportBundle(result, parsed.headers);
    expect(result.rejected[0].issues[0].code).toBe('POTENTIAL_FORMULA');
    expect(bundle['rejected.csv']).toContain("'=2+2");
  });

  it('processes 50,000 fictional rows without losing records', () => {
    const rows = Array.from({ length: 50_000 }, (_, index) => ({
      __rowNumber: index + 2,
      ID: String(index + 1),
      Email: `person${index + 1}@example.com`,
    }));
    const result = processRows(rows, {
      headers: ['ID', 'Email'],
      emailField: 'Email',
      requiredFields: ['ID', 'Email'],
      dedupeFields: ['Email'],
    });
    expect(result.summary).toEqual({ total: 50_000, clean: 50_000, changed: 0, rejected: 0, duplicates: 0 });
  }, 10_000);
});
