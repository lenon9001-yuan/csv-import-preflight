import './app.css';

import { processRows } from './cleaner/engine.js';
import { createExportBundle, downloadCsv } from './cleaner/export.js';
import { MAX_RECOMMENDED_ROWS, parseCsvFile } from './cleaner/parse.js';

const state = {
  file: null,
  parsed: null,
  result: null,
  bundle: null,
  filter: 'all',
  config: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const elements = {
  fileInput: $('#file-input'),
  dropZone: $('#drop-zone'),
  globalError: $('#global-error'),
  globalErrorText: $('#global-error-text'),
  overlay: $('#processing-overlay'),
  processingTitle: $('#processing-title'),
  processingDetail: $('#processing-detail'),
  startOver: $('#start-over'),
  fileTicket: $('#file-ticket'),
  ticketName: $('#ticket-name'),
  ticketMeta: $('#ticket-meta'),
  planStatus: $('#plan-status'),
  mappingForm: $('#mapping-form'),
  emailField: $('#email-field'),
  phoneField: $('#phone-field'),
  dateField: $('#date-field'),
  requiredFields: $('#required-fields'),
  dedupeFields: $('#dedupe-fields'),
  defaultCountry: $('#default-country'),
  dateOrder: $('#date-order'),
  sourcePreview: $('#source-preview'),
  resultsTable: $('#results-table'),
  filterTitle: $('#filter-title'),
  resultLimitNote: $('#result-limit-note'),
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function rowCountLabel(count) {
  return `${count.toLocaleString()} row${count === 1 ? '' : 's'}`;
}

function showError(message) {
  elements.globalErrorText.textContent = message;
  elements.globalError.classList.remove('hidden');
  elements.globalError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearError() {
  elements.globalError.classList.add('hidden');
  elements.globalErrorText.textContent = '';
}

function setProcessing(active, title = 'Reading CSV…', detail = 'Processing inside this browser tab') {
  elements.processingTitle.textContent = title;
  elements.processingDetail.textContent = detail;
  elements.overlay.classList.toggle('hidden', !active);
}

function showStage(step) {
  $$('.stage').forEach((stage) => stage.classList.remove('active'));
  const stage = step === 1 ? $('#stage-load') : step === 2 ? $('#stage-map') : $('#stage-results');
  stage.classList.add('active');

  $$('[data-plan-step]').forEach((item) => {
    const itemStep = Number(item.dataset.planStep);
    item.classList.toggle('active', itemStep === step);
    item.classList.toggle('complete', itemStep < step);
  });

  elements.planStatus.textContent = step === 1 ? 'Awaiting file' : step === 2 ? 'Mapping fields' : 'Ready to export';
  elements.startOver.classList.toggle('hidden', step === 1);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function option(select, value, label, selected = false) {
  const item = document.createElement('option');
  item.value = value;
  item.textContent = label;
  item.selected = selected;
  select.append(item);
}

function guessHeader(headers, pattern) {
  return headers.find((header) => pattern.test(header)) ?? '';
}

function populateFieldSelect(select, selectedValue) {
  select.replaceChildren();
  option(select, '', 'Not mapped', !selectedValue);
  state.parsed.headers.forEach((header) => option(select, header, header, header === selectedValue));
}

function makeCheck(name, field, checked) {
  const label = document.createElement('label');
  label.className = 'check-card';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.name = name;
  input.value = field;
  input.checked = checked;
  const marker = document.createElement('span');
  marker.setAttribute('aria-hidden', 'true');
  const text = document.createElement('b');
  text.textContent = field;
  label.append(input, marker, text);
  return label;
}

function renderRequiredFields(defaults = []) {
  elements.requiredFields.replaceChildren();
  state.parsed.headers.forEach((header) => {
    elements.requiredFields.append(makeCheck('required-field', header, defaults.includes(header)));
  });
}

function renderDedupeFields(preserve = []) {
  const candidates = [...new Set([elements.emailField.value, elements.phoneField.value].filter(Boolean))];
  elements.dedupeFields.replaceChildren();
  if (!candidates.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-rule';
    empty.textContent = 'Map an email or phone column to enable duplicate checks.';
    elements.dedupeFields.append(empty);
    return;
  }
  candidates.forEach((field) => {
    elements.dedupeFields.append(makeCheck('dedupe-field', field, preserve.length ? preserve.includes(field) : true));
  });
}

function appendCell(row, value, tag = 'td') {
  const cell = document.createElement(tag);
  cell.textContent = String(value ?? '');
  cell.title = String(value ?? '');
  row.append(cell);
}

function renderSourcePreview() {
  elements.sourcePreview.replaceChildren();
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  appendCell(headRow, 'Row', 'th');
  state.parsed.headers.forEach((header) => appendCell(headRow, header, 'th'));
  head.append(headRow);

  const body = document.createElement('tbody');
  state.parsed.rows.slice(0, 5).forEach((source) => {
    const row = document.createElement('tr');
    appendCell(row, source.__rowNumber);
    state.parsed.headers.forEach((header) => appendCell(row, source[header]));
    body.append(row);
  });
  elements.sourcePreview.append(head, body);
}

function prepareMapping() {
  const { headers, rowCount, delimiter } = state.parsed;
  const email = guessHeader(headers, /(^|\b)(e-?mail|email address)(\b|$)/i);
  const phone = guessHeader(headers, /(^|\b)(phone|mobile|telephone|tel)(\b|$)/i);
  const date = guessHeader(headers, /(date|created|signup|joined)/i);
  const name = guessHeader(headers, /(^|\b)(first name|name)(\b|$)/i);

  populateFieldSelect(elements.emailField, email);
  populateFieldSelect(elements.phoneField, phone);
  populateFieldSelect(elements.dateField, date);
  renderRequiredFields([name, email].filter(Boolean));
  renderDedupeFields();
  renderSourcePreview();

  $('#overview-rows').textContent = rowCount.toLocaleString();
  $('#overview-columns').textContent = headers.length.toLocaleString();
  $('#overview-delimiter').textContent = delimiter === ',' ? 'Comma' : delimiter === '\t' ? 'Tab' : delimiter || 'Unknown';
  $('#overview-size').textContent = formatBytes(state.file.size);

  elements.ticketName.textContent = state.file.name;
  elements.ticketMeta.textContent = `${rowCount.toLocaleString()} rows · ${headers.length} columns`;
  elements.fileTicket.classList.remove('hidden');
}

async function handleFile(file) {
  clearError();
  if (!file.name.toLowerCase().endsWith('.csv')) {
    showError('Choose a file with the .csv extension.');
    return;
  }

  setProcessing(true, 'Reading CSV…', 'The file stays inside this browser tab');
  try {
    const parsed = await parseCsvFile(file);
    if (parsed.errors.length) {
      const first = parsed.errors[0];
      const row = first.row ? ` Row ${first.row}:` : '';
      throw new Error(`${row} ${first.message}`.trim());
    }
    if (!parsed.rowCount) throw new Error('The CSV has headers but no data rows.');
    if (parsed.headers.length > 200) throw new Error('This file has more than 200 columns. Reduce the columns and try again.');

    state.file = file;
    state.parsed = parsed;
    state.result = null;
    state.bundle = null;
    prepareMapping();
    showStage(2);

    if (parsed.rowCount > MAX_RECOMMENDED_ROWS) {
      showError(`This file has ${parsed.rowCount.toLocaleString()} rows. It can run, but 50,000 rows or fewer is recommended for this beta.`);
    }
  } catch (error) {
    showStage(1);
    showError(error.message || 'The CSV could not be read.');
  } finally {
    setProcessing(false);
  }
}

function getCheckedValues(name) {
  return $$(`input[name="${name}"]:checked`).map((input) => input.value);
}

function resultRowsForFilter(filter) {
  if (filter === 'clean') return state.result.report.filter((row) => row.status === 'clean');
  if (filter === 'changed') return state.result.report.filter((row) => row.status === 'clean' && row.changes.length);
  if (filter === 'rejected') return state.result.rejected;
  if (filter === 'duplicate') return state.result.duplicates;
  return state.result.report;
}

function statusLabel(row) {
  if (row.status === 'duplicate') return 'Duplicate';
  if (row.status === 'rejected') return 'Rejected';
  if (row.changes.length) return 'Auto-fixed';
  return 'Ready';
}

function findingText(row) {
  if (row.issues.length) return row.issues.map((item) => `${item.field}: ${item.message}`).join(' · ');
  if (row.status === 'duplicate') return `Exact match with source row ${row.duplicateOfRow} (${row.duplicateKey})`;
  if (row.changes.length) return row.changes.map((change) => change.reason).join(' · ');
  return 'No issues found.';
}

function renderResultsTable(filter = state.filter) {
  state.filter = filter;
  const rows = resultRowsForFilter(filter);
  const labels = { all: 'All rows', clean: 'Ready rows', changed: 'Auto-fixed rows', rejected: 'Rejected rows', duplicate: 'Duplicate rows' };
  elements.filterTitle.textContent = labels[filter];
  elements.resultLimitNote.textContent = rows.length > 100 ? `Showing first 100 of ${rows.length.toLocaleString()} rows` : `${rows.length.toLocaleString()} rows`;

  $$('.metric').forEach((metric) => metric.classList.toggle('active', metric.dataset.filter === filter));
  elements.resultsTable.replaceChildren();
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Source row', 'Status', 'Primary value', 'Finding', 'Changes'].forEach((heading) => appendCell(headRow, heading, 'th'));
  head.append(headRow);
  const body = document.createElement('tbody');
  const primaryField = state.config.emailField || state.parsed.headers[0];

  rows.slice(0, 100).forEach((resultRow) => {
    const row = document.createElement('tr');
    appendCell(row, resultRow.rowNumber);

    const statusCell = document.createElement('td');
    const tag = document.createElement('span');
    const status = statusLabel(resultRow);
    tag.className = `result-status status-${status.toLowerCase()}`;
    tag.textContent = status;
    statusCell.append(tag);
    row.append(statusCell);

    appendCell(row, resultRow.normalized[primaryField] || '—');
    appendCell(row, findingText(resultRow));
    appendCell(row, resultRow.changes.length ? `${resultRow.changes.length} field${resultRow.changes.length === 1 ? '' : 's'}` : '—');
    body.append(row);
  });

  if (!rows.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.className = 'empty-table';
    cell.textContent = 'No rows in this category.';
    row.append(cell);
    body.append(row);
  }
  elements.resultsTable.append(head, body);
}

function renderResults() {
  const { summary } = state.result;
  $('#metric-total').textContent = summary.total.toLocaleString();
  $('#metric-clean').textContent = summary.clean.toLocaleString();
  $('#metric-changed').textContent = summary.changed.toLocaleString();
  $('#metric-rejected').textContent = summary.rejected.toLocaleString();
  $('#metric-duplicates').textContent = summary.duplicates.toLocaleString();
  $('#result-summary-text').textContent = `${summary.clean.toLocaleString()} of ${summary.total.toLocaleString()} rows are ready for import. Review rejected and duplicate rows before using the clean file.`;
  $('#completed-file-name').textContent = state.file.name;

  $('#download-clean-count').textContent = rowCountLabel(summary.clean);
  $('#download-rejected-count').textContent = rowCountLabel(summary.rejected);
  $('#download-duplicate-count').textContent = rowCountLabel(summary.duplicates);
  $('#download-report-count').textContent = rowCountLabel(summary.total);
  state.filter = 'all';
  renderResultsTable('all');
}

async function runPreflight() {
  clearError();
  const specialFields = [elements.emailField.value, elements.phoneField.value, elements.dateField.value].filter(Boolean);
  if (new Set(specialFields).size !== specialFields.length) {
    showError('Email, phone, and date must map to different columns.');
    return;
  }

  state.config = {
    headers: state.parsed.headers,
    emailField: elements.emailField.value,
    phoneField: elements.phoneField.value,
    dateField: elements.dateField.value,
    requiredFields: getCheckedValues('required-field'),
    dedupeFields: getCheckedValues('dedupe-field'),
    defaultCountry: elements.defaultCountry.value,
    dateOrder: elements.dateOrder.value,
  };

  setProcessing(true, 'Running preflight…', `Checking ${state.parsed.rowCount.toLocaleString()} rows locally`);
  await new Promise((resolve) => window.setTimeout(resolve, 80));
  try {
    state.result = processRows(state.parsed.rows, state.config);
    state.bundle = createExportBundle(state.result, state.parsed.headers);
    renderResults();
    showStage(3);
  } catch (error) {
    showError(error.message || 'The preflight could not be completed.');
  } finally {
    setProcessing(false);
  }
}

function resetApp() {
  state.file = null;
  state.parsed = null;
  state.result = null;
  state.bundle = null;
  state.config = null;
  elements.fileInput.value = '';
  elements.fileTicket.classList.add('hidden');
  clearError();
  showStage(1);
}

$('#choose-file').addEventListener('click', (event) => {
  event.stopPropagation();
  elements.fileInput.click();
});
elements.dropZone.addEventListener('click', () => elements.fileInput.click());
elements.dropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    elements.fileInput.click();
  }
});
elements.fileInput.addEventListener('change', () => handleFile(elements.fileInput.files[0]));

['dragenter', 'dragover'].forEach((eventName) => elements.dropZone.addEventListener(eventName, (event) => {
  event.preventDefault();
  elements.dropZone.classList.add('dragging');
}));
['dragleave', 'drop'].forEach((eventName) => elements.dropZone.addEventListener(eventName, (event) => {
  event.preventDefault();
  elements.dropZone.classList.remove('dragging');
}));
elements.dropZone.addEventListener('drop', (event) => handleFile(event.dataTransfer.files[0]));

$('#load-sample').addEventListener('click', async () => {
  clearError();
  setProcessing(true, 'Preparing sample…', 'Loading fictional contacts only');
  try {
    const response = await fetch('/samples/sample-contacts.csv');
    if (!response.ok) throw new Error('The sample file is unavailable.');
    const blob = await response.blob();
    await handleFile(new File([blob], 'sample-contacts.csv', { type: 'text/csv' }));
  } catch (error) {
    showError(error.message);
  } finally {
    setProcessing(false);
  }
});

[elements.emailField, elements.phoneField].forEach((select) => select.addEventListener('change', () => {
  const selected = getCheckedValues('dedupe-field');
  renderDedupeFields(selected);
}));
elements.mappingForm.addEventListener('submit', (event) => {
  event.preventDefault();
  runPreflight();
});
elements.startOver.addEventListener('click', resetApp);

$$('.metric').forEach((metric) => metric.addEventListener('click', () => renderResultsTable(metric.dataset.filter)));
$$('[data-download]').forEach((button) => button.addEventListener('click', () => {
  const filename = button.dataset.download;
  if (state.bundle?.[filename]) downloadCsv(filename, state.bundle[filename]);
}));

showStage(1);
