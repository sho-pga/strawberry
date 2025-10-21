# Shared Scripts Documentation

The `shared/` directory currently contains no scripts. This directory is reserved for utilities and scripts that are used by both the client and server components.

## Future Script Guidelines

When adding scripts to this directory, ensure they:

1. Are truly shared between client and server
2. Have clear documentation of their purpose and usage
3. Follow the same health check patterns as client and server scripts
4. Include appropriate test coverage

## Script Documentation Template

When adding new scripts, use this template:

````markdown
### `scripts/script-name.sh`

**Purpose**: Brief description of the script's purpose

**Usage**:

```bash
./scripts/script-name.sh [--check=all]
```
````

**Options**:

- `--check=all`: Description of all check
- `--check=specific`: Description of specific check

**Execution Criteria**:

- List any prerequisites
- List any environment requirements
- List any dependency requirements

```

```
