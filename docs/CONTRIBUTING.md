# Contributing

See the [installation guide](../README.md#installation) for requirements and setup.

If you use `nvm`, run `nvm install` and `nvm use` in the clone to select the version in [`.nvmrc`](../.nvmrc).

## Run

Build and run your checkout; rebuild after changing code.

```bash
npm run build
node dist/cli.js
```

## Check Changes

Run these checks before opening a pull request.

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

`npm run format` edits files; run it before the checks when formatting is needed.

CI runs these checks using the version in `.nvmrc`; check other supported versions locally when changing runtime compatibility.

Tests use `tests/fixtures/`; verify changes against your installed packages with `node dist/cli.js`.

For intentional output changes, run `npm run test:update` and review the snapshot diff.

## Commits & Pull Requests

- Use English `Conventional Commits` titles for commits and pull requests.
