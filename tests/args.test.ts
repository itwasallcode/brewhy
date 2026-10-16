/**
 * Verifies how command-line arguments select packages and display options.
 * Checks parsing and validation without running the CLI or querying Homebrew.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseArgs } from "../src/args.js";

describe("parseArgs", () => {
  it("hides the cask list by default", () => {
    const parsed = parseArgs([]);
    assert.equal(parsed.name, null);
    assert.equal(parsed.help, false);
    assert.equal(parsed.isCaskListHidden, true);
    assert.equal(parsed.version, false);
  });

  it("shows casks on request", () => {
    assert.equal(parseArgs(["--show-casks"]).isCaskListHidden, false);
  });

  it("accepts default modifiers in either order", () => {
    assert.equal(parseArgs(["--show-casks", "--default"]).caskDefault, true);
    assert.equal(parseArgs(["--no-default", "--show-casks"]).caskDefault, false);
  });

  it("rejects missing or conflicting default options", () => {
    for (const flag of ["--default", "--no-default"]) {
      assert.throws(() => parseArgs([flag]), /requires '--show-casks'/);
    }
    for (const flags of [
      ["--default", "--no-default"],
      ["--no-default", "--default"],
    ]) {
      assert.throws(() => parseArgs(["--show-casks", ...flags]), /cannot be combined/);
    }
  });

  it("accepts a single package name", () => {
    const parsed = parseArgs(["openssl@3"]);
    assert.equal(parsed.name, "openssl@3");
  });

  it("rejects more than one package name", () => {
    assert.throws(() => parseArgs(["node", "wget"]), /at most one package name/);
  });

  it("rejects unknown options", () => {
    for (const args of [
      ["--hide-casks"],
      ["--nope"],
      ["--tree"],
      ["--jsonf"],
      ["--formula", "wget"],
      ["--cask", "firefox"],
      ["-h"],
      ["-v"],
    ]) {
      assert.throws(() => parseArgs(args), {
        message: `The option '${args[0]}' is not recognized.`,
      });
    }
  });

  it("treats everything after -- as a name", () => {
    assert.equal(parseArgs(["--", "-weird-name"]).name, "-weird-name");
  });
});
