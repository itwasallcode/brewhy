import { compareLabels, labelOf, typeOf } from "../graph/labels.js";
import { shortestPathsFrom } from "../graph/paths.js";
import type { Analysis, ExplainedPackage, RootFacts } from "../graph/types.js";
import { labelled } from "./labels.js";

export interface DependencyRow {
  name: string;
  relation: "Direct" | "Indirect" | "Unknown";
  usage: string;
}

export function dependencyRows(
  analysis: Analysis,
  facts: ExplainedPackage,
  root: RootFacts | undefined,
): DependencyRow[] {
  const direct = new Set(
    facts.type === "formula" ? facts.node.directDependencies : facts.node.dependencies,
  );
  const recorded =
    analysis.reachability.bySource.get(facts.node.ID) ??
    shortestPathsFrom(analysis.graph, facts.node.ID);
  const known =
    analysis.directReachability.bySource.get(facts.node.ID) ??
    shortestPathsFrom({ edges: analysis.graph.directEdges }, facts.node.ID);
  const dependencies = new Set([...recorded.keys(), ...direct]);
  dependencies.delete(facts.node.ID);
  const exclusive = new Set(root?.exclusive);
  const requested = new Set(analysis.graph.requestedRootIDs);
  const sourcesByID = new Set(analysis.roots.map((entry) => entry.ID));

  return [...dependencies]
    .sort((left, right) => compareLabels(labelOf(analysis, left), labelOf(analysis, right)))
    .map((ID) => {
      const sources = analysis.reachability.sourcesByNode.get(ID)?.length ?? 0;
      const usage = requested.has(ID)
        ? "Requested"
        : sourcesByID.has(ID)
          ? "Source"
          : root !== undefined
            ? exclusive.has(ID)
              ? "Exclusive"
              : sources > 1
                ? "Shared"
                : "Unexplained"
            : sources > 1
              ? "Shared"
              : sources === 1
                ? "1 source"
                : "Unexplained";
      return {
        name: labelled(labelOf(analysis, ID), typeOf(ID)),
        relation: direct.has(ID) ? "Direct" : known.has(ID) ? "Indirect" : "Unknown",
        usage,
      };
    });
}
