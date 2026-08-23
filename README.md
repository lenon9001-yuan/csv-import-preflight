# CSV Import Preflight landing page

Marketing site for a local-first CSV cleaner and CRM import preflight tool.

**Live site:** [csv-import-preflight.vercel.app](https://csv-import-preflight.vercel.app)

**Cleaner APP:** [csv-import-preflight.vercel.app/app/](https://csv-import-preflight.vercel.app/app/)

**Development SOP:** [docs/APP-DEVELOPMENT-SOP.zh-CN.md](docs/APP-DEVELOPMENT-SOP.zh-CN.md)

**Beta user guide:** [docs/USER-GUIDE.md](docs/USER-GUIDE.md)

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The generated `dist/` directory can be deployed to Vercel as a static Vite project.

## MVP features

- Browser-only CSV parsing; files are not uploaded to a server.
- Required-field, email, phone, and date validation.
- Exact-match deduplication by mapped email and phone columns.
- Local normalization with a per-row audit trail.
- Separate `clean.csv`, `rejected.csv`, `duplicates.csv`, and `preflight-report.csv` downloads.
