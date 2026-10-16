import { usageError } from "./errors.js";

export interface ParsedArgs {
  name: string | null;
  isCaskListHidden: boolean;
  caskDefault: boolean | null;
  help: boolean;
  version: boolean;
  json: boolean;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    name: null,
    isCaskListHidden: true,
    caskDefault: null,
    help: false,
    version: false,
    json: false,
  };

  const positionals: string[] = [];
  let onlyPositionals = false;

  for (const argument of argv) {
    if (onlyPositionals) {
      positionals.push(argument);
      continue;
    }
    switch (argument) {
      case "--json":
        parsed.json = true;
        break;
      case "--":
        onlyPositionals = true;
        break;
      case "--help":
        parsed.help = true;
        break;
      case "--version":
        parsed.version = true;
        break;
      case "--show-casks":
        parsed.isCaskListHidden = false;
        break;
      case "--default":
      case "--no-default": {
        const value = argument === "--default";
        if (parsed.caskDefault !== null && parsed.caskDefault !== value) {
          throw usageError("The options '--default' and '--no-default' cannot be combined.");
        }
        parsed.caskDefault = value;
        break;
      }
      default:
        if (argument.startsWith("-") && argument !== "-") {
          throw usageError(
            `The option '${argument}' is not recognized.`,
            "Run `brewhy --help` to see the supported options.",
          );
        }
        positionals.push(argument);
    }
  }

  if (positionals.length > 1) {
    throw usageError(
      `The command accepts at most one package name, but ${positionals.length} were provided (${positionals.join(", ")}).`,
      "Explain one package at a time, for example `brewhy openssl@3`.",
    );
  }
  if (parsed.caskDefault !== null && parsed.isCaskListHidden) {
    throw usageError(
      `The option '${parsed.caskDefault ? "--default" : "--no-default"}' requires '--show-casks'.`,
      "Run `brewhy --show-casks --default` or `brewhy --show-casks --no-default`.",
    );
  }
  parsed.name = positionals[0] ?? null;

  return parsed;
}
