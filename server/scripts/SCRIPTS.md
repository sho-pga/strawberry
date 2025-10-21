# Server Scripts Documentation

## Health Check Scripts

### `scripts/db-health.sh`

**Purpose**: Validates database connectivity and health status.

**Usage**:

```bash
./scripts/db-health.sh [--check=all]
```

**Options**:

- `--check=all`: Runs all database health checks (default)
- `--check=connectivity`: Tests basic database connection
- `--check=migrations`: Verifies migration status

### `scripts/smoke-health.sh`

**Purpose**: Performs comprehensive smoke tests of the server environment.

**Usage**:

```bash
./scripts/smoke-health.sh [--check=all]
```

**Options**:

- `--check=all`: Runs all smoke tests (default)
- `--check=server`: Tests server endpoints
- `--check=db`: Tests database connectivity
- `--check=puppeteer`: Validates Puppeteer setup

### `scripts/health-checks.js`

**Purpose**: Core JavaScript module implementing health check logic.

**Usage**:

```javascript
const healthChecks = require("./scripts/health-checks");
```

**Available Checks**:

- Server health status
- Database connectivity
- Puppeteer environment
- PDF generation capabilities

## Export Test Scripts

### `scripts/clean_samples.js`

**Purpose**: Cleans up sample files generated during tests.

### `scripts/run_smoke_export.sh`

**Purpose**: Runs export functionality smoke tests.

### `scripts/smoke-export.sh`

**Purpose**: Simple smoke script that POSTs `server/samples/poems.json` to `/api/export/book` and saves the response PDF to `../samples/ebook.pdf` (default). This is a lightweight hook used by CI or local debugging. The script exits non-zero on HTTP failure.

**Usage**:

```bash
OUT=./samples/ebook.pdf HOST=http://localhost:3000 ./server/scripts/smoke-export.sh
```

**Notes**:

- The script was updated to validate PDF magic bytes (`%PDF-`) after saving the response.
- It defaults to `../samples/ebook.pdf` but can be overridden with `OUT`.

### `scripts/extract-pdf-text.js`

**Purpose**: Node script that extracts text from a PDF file for automated verification in smoke tests or CI. It accepts an optional file path argument; if not provided it reads `../samples/ebook.pdf`.

**Usage**:

```bash
node server/scripts/extract-pdf-text.js ./samples/ebook.pdf
```

**Notes**:

- Used by the verify-export flow to assert that exported PDFs contain expected poem titles.
- This script currently uses `pdf-parse`; conversion to `pdfjs-dist` is planned to remove debug-mode side effects.

### Verify / CI helpers

The server `package.json` includes the following helpful scripts:

- `npm --prefix server run verify-export` — runs the smoke export script and then the extraction script to print extracted text.
- `npm --prefix server run test:export` — runs the Vitest export test (`server/__tests__/export_text.test.mjs`) which starts the server programmatically and asserts PDF content.

### `scripts/run_export_test_inproc.js`

**Purpose**: In-process export testing utility.
