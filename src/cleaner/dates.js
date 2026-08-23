const pad = (value) => String(value).padStart(2, '0');

function validDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function normalizeDate(value, order = 'AUTO') {
  const input = String(value ?? '').trim();
  if (!input) return { value: '', valid: true };

  const parts = input.split(/[\-/.]/).map((part) => part.trim());
  if (parts.length !== 3 || parts.some((part) => !/^\d{1,4}$/.test(part))) {
    return { value: input, valid: false, code: 'INVALID_DATE', message: 'Use a numeric date such as 2026-08-23.' };
  }

  let year;
  let month;
  let day;

  if (parts[0].length === 4) {
    [year, month, day] = parts.map(Number);
  } else if (parts[2].length === 4) {
    year = Number(parts[2]);
    const first = Number(parts[0]);
    const second = Number(parts[1]);

    if (order === 'DMY') {
      day = first;
      month = second;
    } else if (order === 'MDY') {
      month = first;
      day = second;
    } else if (first > 12 && second <= 12) {
      day = first;
      month = second;
    } else if (second > 12 && first <= 12) {
      month = first;
      day = second;
    } else {
      return { value: input, valid: false, code: 'AMBIGUOUS_DATE', message: 'Choose D/M/Y or M/D/Y for this date format.' };
    }
  } else {
    return { value: input, valid: false, code: 'INVALID_DATE', message: 'Use a four-digit year.' };
  }

  if (!validDate(year, month, day)) {
    return { value: input, valid: false, code: 'INVALID_DATE', message: 'This date does not exist.' };
  }

  return { value: `${year}-${pad(month)}-${pad(day)}`, valid: true };
}
