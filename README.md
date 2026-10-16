# Brewhy

A read-only CLI that explains why each formula is installed.

## Preview

<img src="docs/assets/Preview.png" alt="Brewhy" width="700" />

## Installation

### Requirements

- `macOS` with `Homebrew` — [requirements](https://docs.brew.sh/Installation#macos-requirements).
- `Node.js 22.14+ (22.x)` or `24.10+`, with `npm`.
- `Git` for building from source.

### Quick Start

Run this command in your terminal to download and build the latest published release.

```bash
curl -fsSL https://raw.githubusercontent.com/itwasallcode/brewhy/master/scripts/install.sh | bash
```

Open a new terminal and run `brewhy` for an overview; use `brewhy --help` or `brewhy --version` for details.

_If `brewhy` is not found, follow the installer's instructions to add `$HOME/.local/bin` to your shell's `PATH`._

#### Update

Run the installation command again to update to the latest release.

#### Uninstall

To uninstall the release installation, run:

```bash
curl -fsSL https://raw.githubusercontent.com/itwasallcode/brewhy/master/scripts/install.sh | bash -s -- --uninstall
```

This removes Brewhy's installed files and command link; Homebrew packages and shell configuration are preserved.

### Build From Source

Follow the [Build From Source](docs/guides/Build-From-Source.md) guide to build, update or remove a source installation.
