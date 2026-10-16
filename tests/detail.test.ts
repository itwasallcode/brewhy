/**
 * Verifies terminal output for a single package using fixture data.
 * Checks explanations and layout with snapshots and width assertions.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { caskID, formulaID } from "../src/brew/ids.js";
import { parseInventory } from "../src/brew/parser.js";
import { analyze } from "../src/graph/classify.js";
import { buildGraph } from "../src/graph/graph.js";
import { labelOf } from "../src/graph/labels.js";
import { dependencyRows } from "../src/render/dependencies.js";
import { renderDetail } from "../src/render/detail.js";
import { analysisOf, assertSnapshot } from "./helpers.js";
import {
  FIXTURES,
  MIN_TERMINAL_WIDTH,
  overview,
  plainOptions,
  stripSgr,
} from "./render-helpers.js";

describe("text detail", () => {
  it("explains a requested formula without dependencies in complete sentences", () => {
    const inventory = parseInventory(
      {
        formulae: [
          {
            name: "example",
            full_name: "example",
            installed: [{ version: "1.0", installed_on_request: true, runtime_dependencies: [] }],
          },
        ],
        casks: [],
      },
      ["example"],
    );
    const analysis = analyze(inventory, buildGraph(inventory));
    const facts = analysis.packages[0];
    assert.ok(facts);
    const rendered = renderDetail(analysis, facts, plainOptions).join("\n");
    assert.match(
      rendered,
      /-> Installed on request\.\n-> No installed dependencies are recorded\./,
    );
    assert.doesNotMatch(rendered, /Dependency\s+Relation\s+Usage/);
  });

  it("states when an installed cask has no dependencies", () => {
    const inventory = parseInventory(
      {
        formulae: [],
        casks: [{ token: "example", name: ["Example App"], installed: "1.0", version: "1.0" }],
      },
      [],
    );
    const analysis = analyze(inventory, buildGraph(inventory));
    const facts = analysis.casks[0];
    assert.ok(facts);
    const rendered = renderDetail(analysis, facts, plainOptions).join("\n");
    assert.match(rendered, /-> Installed as a cask\.\n-> No installed dependencies are recorded\./);
    assert.match(rendered, /^example\n1\.0\n/);
    assert.doesNotMatch(rendered, /Example App/);
  });

  it("explains a shared automatic formula", () => {
    const analysis = analysisOf("installed-basic");
    const facts = analysis.byID.get(formulaID("openssl@3"));
    assert.ok(facts);
    assertSnapshot("detail-shared", `${renderDetail(analysis, facts, plainOptions).join("\n")}\n`);
  });

  it("bolds status labels and colors only the package name on a terminal", () => {
    for (const fixture of FIXTURES) {
      const analysis = analysisOf(fixture);
      for (const facts of [...analysis.packages, ...analysis.casks]) {
        const plain = renderDetail(analysis, facts, plainOptions);
        const terminal = renderDetail(analysis, facts, { ...plainOptions, isTTY: true });
        const plainBody = plain.slice(plain.indexOf("") + 1);
        const terminalBody = terminal.slice(terminal.indexOf("") + 1);
        assert.deepEqual(terminalBody.map(stripSgr), plainBody);
        assert.match(terminalBody[0] ?? "", /^-> \x1b\[1m[^\n]+\x1b\[0m\.$/);
        assert.ok(!terminalBody.join("\n").includes("\x1b[1;36m"));
        assert.ok(terminal.some((line) => line.includes(`\x1b[1;36m${facts.label}\x1b[0m`)));
        assert.ok(!plain.join("\n").includes("\x1b"));
      }
    }
  });

  it("gives each fact its own sentence with an arrow", () => {
    const analysis = analysisOf("installed-basic");
    const facts = analysis.byID.get(formulaID("node"));
    assert.ok(facts);
    const lines = renderDetail(analysis, facts, { width: MIN_TERMINAL_WIDTH, isTTY: true });
    const body = lines.slice(lines.indexOf("") + 1).map(stripSgr);
    assert.equal(body[0], "-> Installed on request.");
    assert.ok(body.includes("-> Brings in 4 dependencies: 3 direct and 1 indirect."));
    for (const line of body.filter(Boolean)) assert.match(line, /^-> .+\.$/);
  });

  it("explains a formula required only by an installed cask", () => {
    const analysis = analysisOf("installed-cask-context");
    const facts = analysis.byID.get(formulaID("podman"));
    assert.ok(facts);
    assertSnapshot("detail-cask", `${renderDetail(analysis, facts, plainOptions).join("\n")}\n`);
  });

  it("explains an installed cask that is a displayed root", () => {
    const analysis = analysisOf("installed-cask-context");
    const facts = analysis.caskByID.get(caskID("podman-desktop"));
    assert.ok(facts);
    assertSnapshot(
      "detail-cask-root",
      `${renderDetail(analysis, facts, plainOptions).join("\n")}\n`,
    );
  });

  it("explains a nested cask required by another cask", () => {
    const analysis = analysisOf("installed-cask-context");
    const facts = analysis.caskByID.get(caskID("child-app"));
    assert.ok(facts);
    assertSnapshot(
      "detail-cask-nested",
      `${renderDetail(analysis, facts, plainOptions).join("\n")}\n`,
    );
  });

  it("explains a requested formula that is also a dependency", () => {
    const analysis = analysisOf("installed-shared");
    const facts = analysis.byID.get(formulaID("readline"));
    assert.ok(facts);
    assertSnapshot(
      "detail-requested",
      `${renderDetail(analysis, facts, plainOptions).join("\n")}\n`,
    );
  });

  it("names under a root everything the overview names under it", () => {
    for (const fixture of FIXTURES) {
      const analysis = analysisOf(fixture);
      for (const root of analysis.roots) {
        const facts = analysis.byID.get(root.ID) ?? analysis.caskByID.get(root.ID);
        if (facts === undefined) continue;
        const rendered = renderDetail(analysis, facts, plainOptions).join(" ");
        for (const ID of root.dependencies) {
          const name = labelOf(analysis, ID);
          assert.ok(
            new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(rendered),
            `${fixture}: ${root.label} accounts for ${name}, which its detail view never names`,
          );
        }
      }
    }
  });

  it("keeps headings inside the terminal", () => {
    for (const fixture of FIXTURES) {
      const analysis = analysisOf(fixture);
      for (const facts of [...analysis.packages, ...analysis.casks]) {
        for (const width of [1, 6, 7, 20, 32, 35, 39, MIN_TERMINAL_WIDTH, 80]) {
          const lines = renderDetail(analysis, facts, { width, isTTY: true });
          const heading = lines.slice(0, lines.indexOf("")).map(stripSgr);
          for (const line of heading) {
            assert.ok(
              [...line].length <= width,
              `${facts.label}: "${line}" overflows ${width} columns`,
            );
          }
          const content = heading.join("").replace(/[│\s]/g, "");
          assert.ok(content.includes(facts.label.replace(/\s/g, "")));
          const versions =
            facts.type === "formula" ? facts.node.installedVersions : [facts.node.version];
          for (const version of versions) {
            if (version) assert.ok(content.includes(version.replace(/\s/g, "")));
          }
          if (width < 7) assert.doesNotMatch(heading.join(""), /[┌│└]/);
        }
      }
    }
  });

  it("keeps dependency names in their sentence at all widths", () => {
    const analysis = analysisOf("installed-tap-names");
    const widget = analysis.packages.find((facts) => facts.label === "widget");
    assert.ok(widget);

    for (const width of [MIN_TERMINAL_WIDTH, 80, 160]) {
      for (const isTTY of [false, true]) {
        const lines = renderDetail(analysis, widget, { width, isTTY }).map(stripSgr);
        assert.ok(
          lines.some((line) => /^-> Directly requires .*acme\/tap\/helper/.test(line)),
          lines.join("\n"),
        );
        assert.ok(!lines.some((line) => /^Dependency\s+Relation\s+Usage$/.test(line)));
      }
    }
  });

  it("names each dependency once across the dependency sentences", () => {
    for (const fixture of FIXTURES) {
      const analysis = analysisOf(fixture);
      for (const root of analysis.roots) {
        const facts = analysis.byID.get(root.ID) ?? analysis.caskByID.get(root.ID);
        assert.ok(facts);
        const lines = renderDetail(analysis, facts, plainOptions);
        const rows = lines
          .filter((line) =>
            /^-> (Directly requires |Indirectly requires |Has recorded dependencies with unknown paths:)/.test(
              line,
            ),
          )
          .join("\n");
        for (const ID of root.dependencies) {
          const name = labelOf(analysis, ID).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          assert.equal(
            [...rows.matchAll(new RegExp(`(?<![\\w/@-])${name}(?![\\w/@-])`, "g"))].length,
            1,
            `${fixture}: ${labelOf(analysis, ID)} must appear once`,
          );
        }
      }
    }
  });

  it("identifies which dependencies are exclusive or shared in a mixed root", () => {
    const analysis = analysisOf("installed-basic");
    const facts = analysis.byID.get(formulaID("node"));
    const root = analysis.roots.find((item) => item.ID === formulaID("node"));
    assert.ok(facts);
    assert.ok(root);
    assert.deepEqual(dependencyRows(analysis, facts, root), [
      { name: "ca-certificates", relation: "Indirect", usage: "Shared" },
      { name: "icu4c", relation: "Direct", usage: "Exclusive" },
      { name: "libuv", relation: "Direct", usage: "Exclusive" },
      { name: "openssl@3", relation: "Direct", usage: "Shared" },
    ]);
  });

  it("does not call a dependency exclusive when it is also installed on request", () => {
    const analysis = analysisOf("installed-shared");
    const facts = analysis.byID.get(formulaID("a-tool"));
    assert.ok(facts);
    const rendered = renderDetail(analysis, facts, plainOptions).join("\n");
    assert.match(rendered, /Directly requires readline; it is also installed on request\./);
    assert.doesNotMatch(rendered, /readline[^\n]*used only through a-tool/);
  });

  it("recognizes another cask source in a dependency cycle without calling it exclusive", () => {
    const analysis = analysisOf("installed-cask-cyclic");
    const facts = analysis.caskByID.get(caskID("loop-a"));
    assert.ok(facts);
    const rendered = renderDetail(analysis, facts, plainOptions).join("\n");
    assert.match(
      rendered,
      /Directly requires loop-b \(cask\); it is also an installation source\./,
    );
    assert.doesNotMatch(rendered, /used only through|not explained by any installation source/);
  });

  it("marks a recorded dependency as unknown when its direct path is missing", () => {
    const analysis = analysisOf("installed-runtime-chain");
    analysis.graph.directEdges.set(formulaID("ripgrep"), []);
    analysis.directReachability.bySource.clear();
    const facts = analysis.byID.get(formulaID("opencode"));
    const root = analysis.roots.find((item) => item.ID === formulaID("opencode"));
    assert.ok(facts);
    const rows = dependencyRows(analysis, facts, root);
    assert.equal(rows.find((row) => row.name === "pcre2")?.relation, "Unknown");
    assert.equal(rows.find((row) => row.name === "ripgrep")?.relation, "Direct");
    const rendered = renderDetail(analysis, facts, plainOptions).join("\n");
    assert.match(rendered, /Has recorded dependencies with unknown paths: pcre2\./);
    assert.doesNotMatch(rendered, /Indirectly requires pcre2/);
  });

  it("frames the colored package name, version and homepage with padding", () => {
    for (const fixture of FIXTURES) {
      const analysis = analysisOf(fixture);
      for (const facts of [...analysis.packages, ...analysis.casks]) {
        const terminalOptions = { ...plainOptions, isTTY: true };
        const lines = renderDetail(analysis, facts, terminalOptions);
        const heading = lines.slice(0, lines.indexOf("")).map(stripSgr);
        assert.ok(heading[0]?.startsWith("┌"));
        assert.match(heading[1] ?? "", /^│ +│$/);
        assert.ok(heading[2]?.includes(facts.label));
        assert.match(heading.at(-2) ?? "", /^│ +│$/);
        assert.ok(heading.at(-1)?.startsWith("└"));
        assert.ok(!heading.some((line) => /[╭╮╰╯]/.test(line)));
        assert.equal(new Set(heading.map((line) => line.length)).size, 1);
        if (facts.node.description) assert.ok(!lines.join("\n").includes(facts.node.description));
        if (facts.node.homepage) {
          assert.ok(heading[3]?.includes(new URL(facts.node.homepage).host));
          assert.doesNotMatch(heading[3] ?? "", /https?:\/\/|\/ +│$/);
        }
      }
    }
  });

  it("explains an unexplained formula without implying it is removable", () => {
    const analysis = analysisOf("installed-incomplete");
    const facts = analysis.byID.get(formulaID("gamma"));
    assert.ok(facts);
    const rendered = `${renderDetail(analysis, facts, plainOptions).join("\n")}\n`;
    assertSnapshot("detail-unexplained", rendered);
    assert.match(
      rendered.replace(/\s+/g, " "),
      /This does not mean the formula is safe to remove\./,
    );
  });

  it("uses the singular disclaimer when the inventory has one unexplained formula", () => {
    const rendered = overview("installed-one-unexplained").replace(/\s+/g, " ");
    assert.match(rendered, /does not explain why this formula is installed/);
    assert.match(rendered, /This does not mean the formula is safe to remove/);
    assert.ok(!rendered.includes("these formulae"));
  });

  it("renders an unknown intent as unknown, not as a dependency", () => {
    const analysis = analysisOf("installed-incomplete", null);
    const facts = analysis.byID.get(formulaID("epsilon"));
    assert.ok(facts);
    const rendered = renderDetail(analysis, facts, plainOptions).join("\n");
    assert.match(rendered, /intent unknown/);
    assert.ok(!rendered.includes("as a dependency"));
  });

  it("wraps long names, versions and homepages without losing metadata", () => {
    const cases = [
      {
        name: "python@3.12",
        versions: ["3.12.0", "3.12.1", "3.12.2", "3.12.3"],
      },
      {
        name: "this-is-an-unusually-long-formula-name",
        versions: ["1.0.0"],
      },
    ];
    for (const { name, versions } of cases) {
      const inventory = parseInventory(
        {
          formulae: [
            {
              name,
              full_name: name,
              desc: "Interpreted, interactive, object-oriented programming language",
              homepage: "https://www.python.org/about/gettingstarted/",
              linked_keg: versions[versions.length - 1],
              installed: versions.map((version) => ({
                version,
                installed_on_request: true,
                runtime_dependencies: [],
              })),
            },
          ],
          casks: [],
        },
        [name],
      );
      const analysis = analyze(inventory, buildGraph(inventory));
      const facts = analysis.packages[0];
      assert.ok(facts, name);
      const lines = renderDetail(analysis, facts, { width: MIN_TERMINAL_WIDTH, isTTY: true });
      for (const line of lines.slice(0, lines.indexOf(""))) {
        assert.ok(
          stripSgr(line).length <= MIN_TERMINAL_WIDTH,
          `${name}: line wider than the terminal: ${line}`,
        );
      }
      const rendered = stripSgr(lines.join("\n")).replace(/\s+/g, " ");
      assert.ok(rendered.replace(/[│\s]/g, "").includes(name));
      for (const version of versions) assert.ok(rendered.includes(version));
      assert.ok(
        !rendered.includes("Interpreted, interactive, object-oriented programming language"),
      );
      assert.ok(rendered.replace(/[│\s]/g, "").includes("www.python.org/about/gettingstarted"));
      assert.doesNotMatch(rendered, /https?:\/\/|gettingstarted\//);
    }
  });
});
