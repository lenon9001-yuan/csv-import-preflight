import Papa from 'papaparse';

function unparse(rows, columns) {
  return Papa.unparse({ fields: columns, data: rows }, { quotes: true, newline: '\r\n', escapeFormulae: true });
}

export function createExportBundle(result, headers) {
  const cleanRows = result.clean.map((row) => headers.map((header) => row.normalized[header]));
  const rejectedColumns = [...headers, '_source_row', '_preflight_issues'];
  const rejectedRows = result.rejected.map((row) => [
    ...headers.map((header) => row.original[header]), row.rowNumber,
    row.issues.map((item) => `${item.code}:${item.field}`).join(' | '),
  ]);
  const duplicateColumns = [...headers, '_source_row', '_duplicate_of_row', '_duplicate_key'];
  const duplicateRows = result.duplicates.map((row) => [
    ...headers.map((header) => row.normalized[header]), row.rowNumber, row.duplicateOfRow, row.duplicateKey,
  ]);
  const reportColumns = ['source_row', 'status', 'issue_codes', 'issue_details', 'changed_fields', 'changes'];
  const reportRows = result.report.map((row) => [
    row.rowNumber,
    row.status,
    row.issues.map((item) => item.code).join(' | '),
    row.issues.map((item) => `${item.field}: ${item.message}`).join(' | '),
    [...new Set(row.changes.map((change) => change.field))].join(' | '),
    row.changes.map((change) => `${change.field}: "${change.before}" -> "${change.after}"`).join(' | '),
  ]);
  return {
    'clean.csv': unparse(cleanRows, headers),
    'rejected.csv': unparse(rejectedRows, rejectedColumns),
    'duplicates.csv': unparse(duplicateRows, duplicateColumns),
    'preflight-report.csv': unparse(reportRows, reportColumns),
  };
}

export function downloadCsv(filename, content) {
  const blob = new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
