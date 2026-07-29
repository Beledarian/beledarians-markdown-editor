# Contributing

Beledarians Markdown Editor is a personal pre-release project. Focused bug
fixes, platform reports, accessibility improvements, and documentation updates
are welcome. Large redesigns should begin with an issue describing the user
problem and verification plan.

## Development setup

```bash
npm ci
npm run dev
```

Desktop development additionally requires Rust and the platform-specific Tauri
prerequisites. Android development requires an Android SDK.

## Required resource limits

The test suite must remain safe on constrained machines:

- Do not configure Node with more than a 1 GB heap.
- Run Vitest with isolated forks.
- Use at most two workers.

```bash
NODE_OPTIONS=--max-old-space-size=1024 npm test -- --run --pool=forks --maxWorkers=2
```

PowerShell:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=1024'
npm test -- --run --pool=forks --maxWorkers=2
```

## Verification

Run checks proportional to the change:

```bash
npm run lint
npm test -- --run --pool=forks --maxWorkers=2
node --test cli/contract.test.mjs
npm run audit:design
npm run build
```

For native changes:

```bash
cd src-tauri
cargo test --locked
```

Compilation is not proof that a native workflow works. Clearly state which
platforms and UI paths were actually exercised.

## Pull requests

- Keep changes focused and preserve unrelated work.
- Add regression tests for bug fixes when practical.
- Do not commit dependencies, build output, installers, logs, credentials, or
  agent-session state.
- Distinguish implemented, compiled, tested, and runtime-verified claims.
- Report skipped or unavailable platform checks explicitly.

By contributing, you agree that your contribution is licensed under the MIT
License.
