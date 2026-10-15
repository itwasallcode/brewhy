/**
 * Checks preference persistence without accessing the user's configuration.
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type TestContext, describe, it } from "node:test";

import { FilePreferences } from "../src/preferences.js";

function fixture(context: TestContext) {
  const root = mkdtempSync(join(tmpdir(), "brewhy-preferences-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  return { root, path: join(root, "brewhy", "config.json"), store: new FilePreferences(root) };
}

describe("preferences", () => {
  it("does not create a config when reading an unset preference", async (context) => {
    const { path, store } = fixture(context);
    assert.equal(await store.showCasks(), false);
    assert.equal(existsSync(path), false);
  });

  it("preserves other settings when saving and clearing", async (context) => {
    const { root, path, store } = fixture(context);
    mkdirSync(join(root, "brewhy"));
    writeFileSync(path, '{"other":42}');
    await store.setShowCasks(true);
    assert.equal(await new FilePreferences(root).showCasks(), true);
    await store.setShowCasks(false);
    assert.equal(await new FilePreferences(root).showCasks(), false);
    assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), { other: 42 });
  });

  it("reports malformed settings without overwriting them", async (context) => {
    const { root, path, store } = fixture(context);
    mkdirSync(join(root, "brewhy"));
    for (const text of ['{"showCasks":"yes"}', "null", "[]", "{broken"]) {
      writeFileSync(path, text);
      await assert.rejects(store.showCasks(), /Cannot read preferences/);
      await assert.rejects(store.setShowCasks(true), /Cannot read preferences/);
      assert.equal(readFileSync(path, "utf8"), text);
    }
  });

  it("reports save failures", async (context) => {
    const { root } = fixture(context);
    const blocked = join(root, "blocked");
    writeFileSync(blocked, "file");
    await assert.rejects(new FilePreferences(blocked).setShowCasks(true), /Cannot .* preferences/);
  });
});
