import Papa from 'papaparse';

export const MAX_FILE_SIZE = 20 * 1024 * 1024;
export const MAX_RECOMMENDED_ROWS = 50_000;

const cleanHeader = (header) => String(header ?? '').replace(/^\uFEFF/, '').trim();

function formatResult(parsed) {
  const headers = parsed.meta.fields ?? [];
  const errors = parsed.errors.map((error) => ({
    code: error.code,
    message: error.message,
    row: Number.isInteger(error.row) ? error.row + 2 : undefined,
  }));

  if (!headers.length) errors.unshift({ code: 'NO_HEADERS', message: 'No header row was found.' });
  if (headers.some((header) => !header)) errors.unshift({ code: 'EMPTY_HEADER', message: 'Every column needs a header name.' });
  if (parsed.meta.renamedHeaders && Object.keys(parsed.meta.renamedHeaders).length) {
    errors.unshift({ code: 'DUPLICATE_HEADERS', message: 'Duplicate header names were found. Rename them before continuing.' });
  }

  return {
    headers,
    rows: parsed.data.map((row, index) => ({
      __rowNumber: index + 2,
      ...Object.fromEntries(headers.map((header) => [header, String(row[header] ?? '')])),
    })),
    delimiter: parsed.meta.delimiter,
    errors,
    rowCount: parsed.data.length,
  };
}

export function parseCsvText(text) {
  return formatResult(Papa.parse(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: cleanHeader,
    dynamicTyping: false,
  }));
}

export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Choose a CSV file to continue.'));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error('This file is larger than the 20 MB limit.'));
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: cleanHeader,
      dynamicTyping: false,
      complete: (parsed) => resolve(formatResult(parsed)),
      error: (error) => reject(new Error(error.message || 'The CSV could not be read.')),
    });
  });
}
