import { describe, expect, it } from "vitest";

import { purgeUserFiles, type StorageBucket } from "./purge";

const USER = "7826ba28-3a7f-43ef-a04b-a59d03128470";

/** An in-memory bucket: folders are listed like Storage lists them (no id). */
function fakeBucket(paths: string[]) {
  const files = new Set(paths);
  const removed: string[][] = [];
  const bucket: StorageBucket = {
    async list(folder, options) {
      const children = new Map<string, boolean>();
      for (const path of files) {
        if (!path.startsWith(`${folder}/`)) continue;
        const rest = path.slice(folder.length + 1);
        const [head, ...tail] = rest.split("/");
        children.set(head, tail.length === 0 || children.get(head) === true);
      }
      const entries = [...children].map(([name, isFile]) => ({
        name,
        id: isFile ? `id-${name}` : null,
      }));
      const offset = options?.offset ?? 0;
      return { data: entries.slice(offset, offset + (options?.limit ?? 100)), error: null };
    },
    async remove(batch) {
      removed.push(batch);
      for (const path of batch) files.delete(path);
      return { data: batch, error: null };
    },
  };
  return { bucket, files, removed };
}

describe("account purge: files", () => {
  it("removes every file under the user's folder, in every subfolder", async () => {
    const { bucket, files } = fakeBucket([
      `${USER}/avatar/a.webp`,
      `${USER}/offers/b.webp`,
      `${USER}/page/c.webp`,
      `${USER}/files/d.pdf`,
      "someone-else/avatar/x.webp",
    ]);
    expect(await purgeUserFiles(bucket, USER)).toBe(4);
    expect([...files]).toEqual(["someone-else/avatar/x.webp"]);
  });

  it("goes through folders larger than one page of listing", async () => {
    const many = Array.from({ length: 250 }, (_, i) => `${USER}/page/${i}.webp`);
    const { bucket, files, removed } = fakeBucket(many);
    expect(await purgeUserFiles(bucket, USER)).toBe(250);
    expect(files.size).toBe(0);
    expect(removed.length).toBe(3);
  });

  it("does nothing on an empty folder, and refuses a path that is not a user id", async () => {
    const { bucket } = fakeBucket([]);
    expect(await purgeUserFiles(bucket, USER)).toBe(0);
    await expect(purgeUserFiles(bucket, "../")).rejects.toThrow();
  });
});
