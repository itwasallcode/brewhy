/**
 * Verifies package lookup through the application using fixture inventories.
 * Checks aliases, formula and cask selection, and the error for a missing name.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { run } from "../src/app.js";
import type { RawBrewInfo } from "../src/brew/types.js";
import { StaticBrewClient, runFixture } from "./helpers.js";

describe("package lookup", () => {
  it("exits 2 when the requested package is not installed", async () => {
    const result = await runFixture("installed-basic", ["ghost"]);
    assert.equal(result.exitCode, 2);
    assert.match(result.stderr, /ghost is not installed/);
    assert.equal(result.stdout, "");
  });

  it("explains an installed cask by its token", async () => {
    const result = await runFixture("installed-cask-context", ["podman-desktop"]);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /podman-desktop/);
    assert.match(result.stdout, /as a cask/);
    assert.match(result.stdout, /podman/);
  });

  it("explains a cask found by a former token instead of calling it uninstalled", async () => {
    const result = await runFixture("installed-cask-aliases", ["widget"]);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /widget-app/);
    assert.match(result.stdout, /as a cask/);
  });

  it("explains a tap cask by its short token", async () => {
    const result = await runFixture("installed-cask-aliases", ["widget-app"]);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /widget-app/);
    assert.match(result.stdout, /as a cask/);
  });

  it("explains a nested cask required by another cask", async () => {
    const result = await runFixture("installed-cask-context", ["child-app"]);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /child-app/);
    assert.match(result.stdout, /as a cask/);
    assert.match(result.stdout, /parent-app \(cask\)/);
  });

  it("explains both the formula and the cask when a name is both", async () => {
    const payload: RawBrewInfo = {
      formulae: [
        {
          name: "docker",
          full_name: "docker",
          desc: "docker description",
          installed: [
            {
              version: "1.0.0",
              installed_on_request: true,
              runtime_dependencies: [],
            },
          ],
        },
      ],
      casks: [
        {
          token: "docker",
          full_token: "docker",
          name: ["Docker"],
          version: "1.0.0",
          installed: "1.0.0",
        },
      ],
    };
    const deps = {
      client: new StaticBrewClient(payload, ["docker"]),
      isTTY: false,
      width: 80,
      version: "0.1.0-test",
    };
    const result = await run(["docker"], deps);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /^docker$/m);
    assert.match(result.stdout, /^docker \(cask\)$/m);
    assert.match(result.stdout, /on request/);
    assert.match(result.stdout, /as a cask/);
  });

  it("resolves a formula through its alias", async () => {
    const result = await runFixture("installed-basic", ["openssl"]);
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /^openssl@3$/m);
  });
});
