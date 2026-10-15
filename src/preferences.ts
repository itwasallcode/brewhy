import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";

import { operationalError } from "./errors.js";

export interface Preferences {
  showCasks(): Promise<boolean>;
  setShowCasks(value: boolean): Promise<void>;
}

export class FilePreferences implements Preferences {
  private readonly path: string;

  constructor(configHome = process.env.XDG_CONFIG_HOME) {
    const root = configHome && isAbsolute(configHome) ? configHome : join(homedir(), ".config");
    this.path = join(root, "brewhy", "config.json");
  }

  private async read(): Promise<Record<string, unknown>> {
    try {
      const value: unknown = JSON.parse(await readFile(this.path, "utf8"));
      if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value) ||
        ("showCasks" in value && typeof value.showCasks !== "boolean")
      ) {
        throw new Error("Expected an object with an optional boolean showCasks setting.");
      }
      return value as Record<string, unknown>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw operationalError(`Cannot read preferences at ${this.path}: ${String(error)}`);
    }
  }

  async showCasks(): Promise<boolean> {
    return (await this.read()).showCasks === true;
  }

  async setShowCasks(value: boolean): Promise<void> {
    const settings = await this.read();
    if (value) settings.showCasks = true;
    else delete settings.showCasks;
    const temporary = `${this.path}.${randomUUID()}.tmp`;
    try {
      await mkdir(dirname(this.path), { recursive: true });
      await writeFile(temporary, `${JSON.stringify(settings, null, 2)}\n`, { mode: 0o600 });
      await rename(temporary, this.path);
    } catch (error) {
      throw operationalError(`Cannot save preferences at ${this.path}: ${String(error)}`);
    } finally {
      await rm(temporary, { force: true }).catch(() => {});
    }
  }
}
