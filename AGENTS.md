# AGENTS.md

## Language

- Write commit descriptions, PR/Issue titles and bodies, review comments, code comments/docstrings, and documentation in English.
- Exceptions: end-user-facing notification text (the Discord notification in `src/main.ts`), Japanese data patterns and fixtures (the full-width character handling in `toHalf` and the Syoboi title format `第N話`), quotations, and technical identifiers.
- `package.json` is always English. Error and log messages are English.

## Overview

Personal tool that cuts commercials (CM) from TS files recorded by EPGStation and converts them to MP4 with Join Logo Scp Encoder (`jlse`). After encoding it sends a Discord notification, and for anime it renames the output using Syoboi Calendar data.

Tech stack: TypeScript run directly with `tsx` (no build step), `config` for configuration, `@book000/node-utils` `Logger` for logging, pnpm.

## Development commands

- `pnpm install`: install dependencies (`preinstall` rejects other package managers)
- `pnpm dev`: run with `tsx watch`
- `pnpm start`: run once (`tsx ./src/main.ts`)
- `pnpm compile`: `tsc -p .`
- `pnpm compile:test`: type check only (`--noEmit`)
- `pnpm lint`: Prettier + ESLint + tsc (run by CI)
- `pnpm fix`: auto-fix with Prettier + ESLint

There are no automated tests. After a change, run `pnpm lint`.

## Architecture

- `src/main.ts`: entry point. Self-update check, outbox flush, then per-file processing (rename, `jlse`, notify, mark as encoded)
- `src/lib/epgstation.ts`: EPGStation API client (fixed to `http://localhost:8888`)
- `src/lib/syoboi.ts`: Syoboi Calendar API client
- `src/lib/utlis.ts`: helpers (file scan, encoded list, file name resolution, `jlse` arguments, Discord, self-update check). The misspelled file name is intentional; do not rename it
- `src/lib/outbox.ts`: persistent outbox for unsent Discord notifications
- `src/types/config-shim.d.ts`: type-check-only stub for `config`, wired through `paths` in `tsconfig.json`
- `SystemdFiles/`: systemd service/timer and `install-systemd.sh`
- `config/`: configuration (git-ignored; create `config/default.yml` manually, see `README.md`)

Conventions: `camelCase` for variables/functions, `PascalCase` for classes, `UPPER_SNAKE_CASE` for constants; avoid `any`; never bypass type errors with `skipLibCheck: true`; Prettier style (no semicolons, single quotes, `printWidth: 80`); HTTP via the built-in `fetch` only.

## Invariants

- `jlse` is executed at the fixed path `/usr/bin/jlse` via `spawn` with an argument array (no shell). Keep it that way so file names cannot cause command injection.
- A file is recorded in `encodedDataFile` (key `dirname/name`) only after encoding succeeded (exit code 0, no signal) and its notification has been persisted to the outbox. Do not reorder these steps, or a notification can be lost after the file is marked as processed.
- `flushNotifications` must not throw on send failure; failed entries stay in the outbox and are retried on the next run. A malformed outbox file must throw instead of being overwritten.
- `processFileName` returns `filename: null` when Syoboi has no subtitle or episode count yet (it may not be published yet), and `main` skips those files so they are retried later.
- `checkLatest` compares `HEAD` with the remote branch head (default `tomacheese/cmcutter` / `master`, overridable via `repo.repo` and `repo.branch`). If outdated, the process runs `git pull` and exits with code 1 so the service restarts on the new code.
- When config keys change, update the README Configuration section. When dev commands or the directory structure change, update `AGENTS.md` and `.github/copilot-instructions.md`.
- Never commit credentials such as `discordToken`, and never log them.
