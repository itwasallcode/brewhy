import type { ExplainedPackage } from "../graph/types.js";
import { labelled } from "./labels.js";
import { type TextOptions, budgetOf, wrapToWidth } from "./layout.js";

export function renderHeading(
  facts: ExplainedPackage,
  options: TextOptions,
  qualifyType = false,
): string[] {
  const label = qualifyType ? labelled(facts.label, facts.type) : facts.label;
  const version = headingVersion(facts);
  if (!options.isTTY) return [label, version].filter(Boolean);

  const width = Math.min(budgetOf(options), Math.max(40, label.length + version.length + 10));
  const inner = width - 6;
  const row = (text: string, styled: string): string =>
    `│  ${styled}${" ".repeat(inner - text.length)}  │`;
  const name = wrapToWidth(label, inner).map((line) => row(line, `\x1b[1;36m${line}\x1b[0m`));
  const versions = wrapToWidth(version, inner).map((line) => row(line, `\x1b[2m${line}\x1b[0m`));
  const rows =
    version.length > 0 && label.length + version.length + 2 <= inner
      ? [row(`${label}  ${version}`, `\x1b[1;36m${label}\x1b[0m  \x1b[2m${version}\x1b[0m`)]
      : [...name, ...(version.length > 0 ? versions : [])];
  const blank = `│${" ".repeat(width - 2)}│`;
  return [`┌${"─".repeat(width - 2)}┐`, blank, ...rows, blank, `└${"─".repeat(width - 2)}┘`];
}

function headingVersion(facts: ExplainedPackage): string {
  if (facts.type === "cask") return facts.node.version ?? "";
  return facts.node.installedVersions.join(", ");
}
