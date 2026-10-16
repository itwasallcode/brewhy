import type { Intent } from "../brew/types.js";
import type { Analysis, ExplainedPackage, RootFacts } from "../graph/types.js";
import { type DependencyRow, dependencyRows } from "./dependencies.js";
import { renderHeading } from "./heading.js";
import { labelled, sourceLabel } from "./labels.js";
import { type TextOptions, plural } from "./layout.js";
import { renderUnexplainedNote } from "./unexplained.js";

interface Sentence {
  lead: string;
  text?: string;
}

export function renderDetail(
  analysis: Analysis,
  facts: ExplainedPackage,
  options: TextOptions,
  qualifyType = false,
): string[] {
  const root = analysis.roots.find((entry) => entry.ID === facts.node.ID);
  const dependencies = dependencyRows(analysis, facts, root);
  const sentences: Sentence[] = [
    { lead: facts.type === "cask" ? "Installed as a cask" : INTENT_LABEL[facts.intent] },
    ...explanationSentences(facts, root),
    ...dependencySentences(dependencies, facts.label, root),
  ];
  if (facts.isShared) {
    const sources = facts.requestedFormulaRoots.length + facts.caskReasonSources.length;
    sentences.push({ lead: "Shared by", text: `${sources} installation sources` });
  }
  const lines = [
    ...renderHeading(facts, options, qualifyType),
    "",
    ...sentences.map((sentence) => renderSentence(sentence, options)),
  ];
  if (facts.type === "formula" && facts.isUnexplained) {
    const note = renderUnexplainedNote("one", options).join(" ");
    lines.push(
      "",
      ...note.split(/(?<=\.)\s+/).map((text) => renderSentence({ lead: "", text }, options)),
    );
  }
  return lines;
}

export function renderDetails(
  analysis: Analysis,
  factsList: ExplainedPackage[],
  options: TextOptions,
): string[] {
  const qualifyType = factsList.length > 1;
  return factsList.flatMap((facts, index) => [
    ...(index === 0 ? [] : ["", ""]),
    ...renderDetail(analysis, facts, options, qualifyType),
  ]);
}

const INTENT_LABEL: Record<Intent, string> = {
  requested: "Installed on request",
  automatic: "Installed as a dependency",
  unknown: "Installation intent unknown",
};

function renderSentence(sentence: Sentence, options: TextOptions): string {
  const lead =
    options.isTTY && sentence.lead.length > 0 ? `\x1b[1m${sentence.lead}\x1b[0m` : sentence.lead;
  const text = [lead, sentence.text].filter(Boolean).join(" ");
  return `-> ${text}${text.endsWith(".") ? "" : "."}`;
}

function joinNames(names: string[]): string {
  if (names.length < 2) return names.join("");
  if (names.length === 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

function dependencySentences(
  rows: DependencyRow[],
  name: string,
  root: RootFacts | undefined,
): Sentence[] {
  if (rows.length === 0) return [{ lead: "No installed dependencies are recorded" }];
  const counts = (["Direct", "Indirect", "Unknown"] as const)
    .map((relation) => ({
      relation,
      count: rows.filter((row) => row.relation === relation).length,
    }))
    .filter((group) => group.count > 0)
    .map(
      ({ relation, count }) =>
        `${count} ${relation === "Unknown" ? "with unknown paths" : relation.toLowerCase()}`,
    );
  const sentences: Sentence[] = [
    {
      lead: "Brings in",
      text: `${rows.length} ${plural(rows.length, "dependency", "dependencies")}: ${joinNames(counts)}`,
    },
  ];
  const usages = [...new Set(rows.map((row) => row.usage))];
  const usageText: Record<string, string> = {
    Requested: "also installed on request",
    Source: "also an installation source",
    Exclusive: `used only through ${name}`,
    Shared: "shared with other installation sources",
    "1 source": "explained by one installation source",
    Unexplained: "not explained by any installation source",
  };
  for (const relation of ["Direct", "Indirect", "Unknown"] as const) {
    for (const usage of usages) {
      const group = rows.filter((row) => row.relation === relation && row.usage === usage);
      if (group.length === 0) continue;
      const lead =
        relation === "Direct"
          ? "Directly requires"
          : relation === "Indirect"
            ? "Indirectly requires"
            : "Has recorded dependencies with unknown paths:";
      const suffix =
        usages.length > 1
          ? `; ${group.length === 1 ? "it is" : "they are"} ${usageText[usage]}`
          : "";
      sentences.push({ lead, text: joinNames(group.map((row) => row.name)) + suffix });
    }
  }
  const usage = usages[0];
  if (usages.length === 1 && usage !== undefined) {
    const subject =
      rows.length === 1 ? "This dependency is" : `All ${rows.length} dependencies are`;
    if (root !== undefined || usage !== "1 source") {
      sentences.push({ lead: `${subject} ${usageText[usage]}` });
    }
  }
  return sentences;
}

function explanationSentences(facts: ExplainedPackage, root: RootFacts | undefined): Sentence[] {
  const dependents = facts.immediateDependents.map(sourceLabel);
  const asRoot =
    facts.type === "cask"
      ? root !== undefined
      : facts.intent === "requested" || facts.isUnexplained;
  const sentences: Sentence[] = [];
  if (dependents.length > 0) {
    sentences.push({
      lead: asRoot ? "Also required by" : "Directly required by",
      text: joinNames(dependents),
    });
  }
  if (asRoot) return sentences;
  const sources = [...facts.requestedFormulaRoots, ...facts.caskReasonSources].map(sourceLabel);
  const sameSources =
    dependents.length === sources.length && dependents.every((name) => sources.includes(name));
  if (sources.length > 0 && !sameSources) {
    sentences.push({ lead: "Installed because of", text: joinNames(sources) });
  }
  for (const path of facts.reasonPaths.filter((entry) => entry.path.length > 2)) {
    sentences.push({
      lead: "Installed through",
      text: path.path
        .map((name, index) => labelled(name, path.pathTypes[index] ?? "formula"))
        .join(" → "),
    });
  }
  return sentences;
}
