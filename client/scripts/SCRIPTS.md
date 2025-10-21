# Client Scripts Documentation

## Health Check Scripts

### `scripts/health-check.sh`

**Purpose**: Validates the client-side environment and development server status.

**Usage**:

```bash
./scripts/health-check.sh [--check=all]
```

**Options**:

- `--check=all`: Runs all available health checks (default)
- `--check=server`: Checks only the development server
- `--check=build`: Validates build environment

**Execution Criteria**:

- Must be run from the client directory
- Requires Node.js and npm to be installed
- Development server should be running for server checks
