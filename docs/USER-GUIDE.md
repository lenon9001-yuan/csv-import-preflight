# CSV Import Preflight — Beta user guide

CSV Import Preflight checks and cleans a CSV in your browser before you import it into a CRM. The selected file is not uploaded to the product server.

## Before you begin

- Use a `.csv` file no larger than 20 MB.
- UTF-8 is recommended.
- Keep your original file. The APP never overwrites it.
- The current beta recommends 50,000 rows or fewer.
- Review every rejected and duplicate row before importing the clean file.

## Run a preflight

1. Open `/app/` and choose a CSV, or load the fictional sample.
2. Confirm the automatically detected Email, Phone, and Date columns.
3. Mark the columns that every importable row must contain.
4. Choose whether exact Email and Phone matches count as duplicates.
5. Choose the default country for phone numbers without a `+` country code.
6. Choose the expected order for ambiguous numeric dates.
7. Select **Run preflight**.
8. Review Ready, Auto-fixed, Rejected, and Duplicate rows.
9. Download the files you need.

## Result meanings

| Status | Meaning |
|---|---|
| Ready | Valid and unique; included in `clean.csv`. |
| Auto-fixed | Valid after deterministic normalization; included in `clean.csv`. |
| Rejected | Missing a required value, invalid, ambiguous, or potentially unsafe; excluded from `clean.csv`. |
| Duplicate | An exact match with an earlier valid Email or Phone; excluded from `clean.csv`. |

## Export files

| File | Contents |
|---|---|
| `clean.csv` | Valid, normalized, unique rows that are ready for import. |
| `rejected.csv` | Original rejected rows with source row numbers and issue codes. |
| `duplicates.csv` | Exact duplicates with the source row and first matching row. |
| `preflight-report.csv` | One audit record per source row, including status, issues, and automatic changes. |

## Current beta limits

- CSV only; no XLS or XLSX.
- One mapped Email, Phone, and Date column per run.
- Numeric dates only.
- Exact-match deduplication only; no fuzzy matching.
- Email format checking does not prove that an inbox exists.
- Phone validation depends on the selected default country or an international `+` number.
- No cloud history, accounts, CRM connection, payment, or license system.

## Report a problem safely

Provide:

- browser name and version;
- file size, row count, and column count;
- the exact error message;
- the selected mapping and rules;
- a small fictional CSV that reproduces the issue.

Do not send a full customer contact list. Replace names, emails, phone numbers, and other personal data with fictional values first.
