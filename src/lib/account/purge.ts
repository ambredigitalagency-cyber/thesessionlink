/**
 * Erasing an account's files before the account itself.
 *
 * Deleting the auth user cascades through every table, but Storage objects
 * are files, not rows: they outlive the account unless removed through the
 * Storage API. Everything a coach uploads lives under media/<user_id>/…
 * (avatar/, offers/, page/, files/ — see lib/media/upload.ts), so the whole
 * folder goes, whatever subfolders it holds.
 *
 * Written against the two Storage calls it needs, so it is tested with a fake.
 */

type Listed = { name: string; id: string | null };

export type StorageBucket = {
  list: (
    path: string,
    options?: { limit?: number; offset?: number },
  ) => Promise<{ data: Listed[] | null; error: unknown }>;
  remove: (paths: string[]) => Promise<{ data: unknown; error: unknown }>;
};

const PAGE = 100;

/** Every object path under a folder. A listed entry without an id is a subfolder. */
export async function listFolder(bucket: StorageBucket, folder: string): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await bucket.list(folder, { limit: PAGE, offset });
    if (error) throw error;
    const entries = data ?? [];
    for (const entry of entries) {
      const path = `${folder}/${entry.name}`;
      if (entry.id === null) paths.push(...(await listFolder(bucket, path)));
      else paths.push(path);
    }
    if (entries.length < PAGE) break;
  }
  return paths;
}

/** Removes everything under media/<userId>/; returns how many files went. */
export async function purgeUserFiles(bucket: StorageBucket, userId: string): Promise<number> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("invalid user id");
  const paths = await listFolder(bucket, userId);
  for (let index = 0; index < paths.length; index += PAGE) {
    const { error } = await bucket.remove(paths.slice(index, index + PAGE));
    if (error) throw error;
  }
  return paths.length;
}
