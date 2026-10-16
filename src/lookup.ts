import { resolveCaskID, resolveFormulaID } from "./brew/ids.js";
import { BrewhyError, usageError } from "./errors.js";
import type { Analysis, ExplainedPackage } from "./graph/types.js";

/**
 * Resolves a name to every installed package that it identifies:
 * an installed formula, an installed cask, or both, in that order.
 */
export function resolvePackages(analysis: Analysis, name: string): ExplainedPackage[] {
  const { inventory } = analysis;
  const formulaNodeID = resolveFormulaID(inventory, name);
  const caskNodeID = resolveCaskID(inventory, name);
  const formula = formulaNodeID === undefined ? undefined : analysis.byID.get(formulaNodeID);
  const cask = caskNodeID === undefined ? undefined : analysis.caskByID.get(caskNodeID);

  const matches: ExplainedPackage[] = [];
  if (formula) matches.push(formula);
  if (cask) matches.push(cask);
  if (matches.length === 0) throw notInstalled(name);
  return matches;
}

function notInstalled(name: string): BrewhyError {
  return usageError(`${name} is not installed.`, "Run `brewhy` to see the installed inventory.");
}
