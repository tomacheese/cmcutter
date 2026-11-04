# GitHub Copilot Instructions

Review focus points only. For the project overview, commands, and invariants, see `AGENTS.md`.

## Review focus

- **Type safety**: flag `any` (explicit or implicit). Reject changes that enable `skipLibCheck: true` to hide type errors.
- **Error handling**: check that failures in external I/O (HTTP to EPGStation / Syoboi Calendar, the `jlse` child process, file operations) are not swallowed.
- **Secrets**: check that `discordToken` or real values from `config/default.yml` do not leak into code, logs, or tests.
- **Command execution**: `jlse` must stay a `spawn` call with an argument array; flag any path that builds a shell command string from file names.
- **Processing order**: a file must be marked as encoded only after its notification is persisted to the outbox.
- **Naming**: `camelCase` variables/functions, `PascalCase` classes, `UPPER_SNAKE_CASE` constants.
- **Comments and docs**: written in English (see the language rules in `AGENTS.md`).

## Do not flag

- Formatting that Prettier/ESLint enforce (`pnpm lint` runs in CI).
- The file name `src/lib/utlis.ts` (misspelled on purpose; do not suggest renaming).
- The missing `config/` directory (git-ignored; users create it manually).
