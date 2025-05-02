import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.resolve("./data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

type State = {
  lastMutationIDByClient: Record<string, number>;
  lastServerVersion: number;
};

export async function loadState(): Promise<State> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const init: State = { lastMutationIDByClient: {}, lastServerVersion: 0 };
    await saveState(init);
    return init;
  }
}

export async function saveState(s: State) {
  await fs.writeFile(STATE_FILE + ".tmp", JSON.stringify(s), "utf8");
  await fs.rename(STATE_FILE + ".tmp", STATE_FILE);
}

// Monotonic microsecond clock
let lastMs = 0;
let seq = 0;
export function nowMicros(): number {
  const ms = Date.now();
  seq = ms === lastMs ? seq + 1 : 0;
  lastMs = ms;
  return ms * 1000 + seq;
}
