# Build From Source

Run these commands in order and stop if one fails.

```bash
git clone https://github.com/itwasallcode/brewhy.git "$HOME/.brewhy"
cd "$HOME/.brewhy"
npm ci --include=dev
npm run build
chmod +x dist/cli.js
ln -s cli.js dist/brewhy
```

Add this line once to the startup file for your shell.

```bash
export PATH="$HOME/.brewhy/dist:$PATH"
```

| Shell            | Startup File                                                     |
| ---------------- | ---------------------------------------------------------------- |
| `zsh`            | `${ZDOTDIR:-$HOME}/.zshrc`                                       |
| Login `bash`     | `~/.bash_profile` or an existing `~/.bash_login` or `~/.profile` |
| Non-login `bash` | `~/.bashrc`                                                      |

For other shells, use their `PATH` syntax.

Open a new terminal or reload the file you edited to update your current terminal.

For `zsh`, reload the file with `source "${ZDOTDIR:-$HOME}/.zshrc"`.

Then check the active command and run `brewhy`.

```bash
command -v brewhy && brewhy --version
brewhy
```

Keep `dist` inside the clone; moving either directory breaks the source command.

When both methods are installed, `command -v brewhy` shows which one will run.

## Optional Update

To use newer source changes, pull them into a clean clone and rebuild; stop if a command fails.

```bash
cd "$HOME/.brewhy"
git pull --ff-only
npm ci --include=dev
npm run build
chmod +x dist/cli.js
ln -s cli.js dist/brewhy
```

Each build recreates `dist`, so repeat the permission and command-link steps after rebuilding.

## Remove

Remove the source `PATH` line from your shell configuration, then open a new terminal.

Delete the clone if you no longer need it.
