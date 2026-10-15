# Contributing

## Run

If you use `nvm`, run `nvm install` and `nvm use` in the clone to select the version in [`.nvmrc`](../.nvmrc).

Install dependencies, build and run your checkout; rebuild after changing code.

```bash
npm ci --include=dev
npm run build
node dist/cli.js
```

## Check Changes

Run `npm run format` before checking when formatting is needed.

Run these commands to lint, check formatting, check types, test and build.

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

CI runs these checks using the version in `.nvmrc`; check other supported versions locally when changing runtime compatibility.

Run `node dist/cli.js` to verify changes against your installed Homebrew packages because automated tests use `tests/fixtures/`.

For intentional output changes, run `npm run test:update` and review the snapshot diff.

## Commits & Pull Requests

- Use English `Conventional Commits` titles for commits and pull requests.
