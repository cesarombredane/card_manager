import fs from "node:fs/promises";
import path from "node:path";

function createEmptyState() {
  return {
    cards: [],
    nextCardId: 1
  };
}

export async function createDatabase(databasePath) {
  const resolvedPath = path.resolve(databasePath);
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });

  async function read() {
    try {
      const raw = await fs.readFile(resolvedPath, "utf8");
      return JSON.parse(raw);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }

      const state = createEmptyState();
      await write(state);
      return state;
    }
  }

  async function write(state) {
    const temporaryPath = `${resolvedPath}.tmp`;
    await fs.writeFile(temporaryPath, JSON.stringify(state, null, 2));
    await fs.rename(temporaryPath, resolvedPath);
  }

  async function update(mutator) {
    const state = await read();
    const result = await mutator(state);
    await write(state);
    return result;
  }

  return { read, write, update };
}
