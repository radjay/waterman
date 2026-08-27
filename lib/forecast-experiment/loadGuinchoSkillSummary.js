import { readFile } from "node:fs/promises";
import path from "node:path";
import { FETCH_COMMANDS, SUMMARY_PATH } from "./guinchoModelSkillConstants.js";

export async function loadGuinchoSkillSummary(cwd = process.cwd()) {
  try {
    const raw = await readFile(path.resolve(cwd, SUMMARY_PATH), "utf8");
    return { ok: true, summary: JSON.parse(raw), commands: FETCH_COMMANDS };
  } catch (error) {
    if (error.code === "ENOENT") {
      return {
        ok: false,
        error: "Summary file is missing. Fetch Open-Meteo runs, then score.",
        commands: FETCH_COMMANDS,
      };
    }
    return { ok: false, error: error.message, commands: FETCH_COMMANDS };
  }
}
