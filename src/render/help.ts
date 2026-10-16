export function programIntro(isTTY: boolean): string {
  const name = isTTY ? "\x1b[1mbrewhy\x1b[0m" : "brewhy";
  return `${name} — A read-only CLI that explains why each formula is installed.`;
}

export function helpText(isTTY: boolean): string {
  return `
${programIntro(isTTY)}

Usage:
  brewhy                            List requested formulae
  brewhy --show-casks               Include casks in the list
  brewhy --json                     Output the full inventory as JSON
  brewhy <name> [--json]            Explain a package

  brewhy --show-casks --default     Show casks on future runs
  brewhy --show-casks --no-default  Hide casks on future runs

  brewhy --help                     Show help
  brewhy --version                  Show version

`;
}
