# @workflow-builder/tools

A collection of scripts and utilities for automating project-specific development tasks

## Available Tools

### Scripts

- **collect-decision-logs**: Compiles a list of `*.decision-log.md` files from the project directory and its subdirectories

### Libraries

- **tls-test-harness** (`@workflow-builder/tools/tls-test-harness`): throwaway CA + server / client certificates, a TLS-terminating proxy for a plaintext Temporal dev server, and an endpoint that records bearer tokens. Used by the TLS connection tests in `apps/backend` and `apps/execution-worker`; never shipped.

## Example of usage

```bash
pnpm -F @workflow-builder/tools collect-decision-logs
```
