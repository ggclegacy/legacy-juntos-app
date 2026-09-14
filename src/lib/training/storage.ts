import { documentSchema, type TrainingDoc } from "./model";
export type Cache = {
  docs: TrainingDoc[];
  pending: string[];
  stamp?: string;
};
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("legacy-training", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("drafts");
    r.onerror = () => reject(r.error);
    r.onsuccess = () => resolve(r.result);
  });
}
export async function readCache(key: string): Promise<Cache | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const t = db.transaction("drafts", "readonly");
    const r = t.objectStore("drafts").get(key);
    t.oncomplete = () => {
      db.close();
      if (!r.result) return resolve(null);
      try {
        resolve({
          docs: r.result.docs.map((d: unknown) => documentSchema.parse(d)),
          pending: r.result.pending,
          stamp: r.result.stamp,
        });
      } catch {
        reject(
          new Error(
            "Saved training data could not be read. Export a backup before clearing this device.",
          ),
        );
      }
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
}
export async function writeCache(
  key: string,
  value: Cache | null,
  expected?: string,
): Promise<string | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const t = db.transaction("drafts", "readwrite");
    const store = t.objectStore("drafts");
    const read = store.get(key);
    let stamp: string | undefined;
    let conflict = false;
    read.onsuccess = () => {
      if (value && read.result?.stamp !== expected) {
        conflict = true;
        t.abort();
        return;
      }
      if (value) {
        stamp = crypto.randomUUID();
        store.put({ ...value, stamp }, key);
      } else store.delete(key);
    };
    t.oncomplete = () => {
      db.close();
      resolve(stamp);
    };
    t.onabort = t.onerror = () => {
      db.close();
      reject(
        new Error(
          conflict
            ? "Another tab changed this device's training. Export this tab's copy, then reload before continuing."
            : "Device storage failed.",
        ),
      );
    };
  });
}
export function download(name: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
