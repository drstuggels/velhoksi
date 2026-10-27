import type { MarkerState } from './markers';
import type { VideoViewState } from './video-geometry';
import type { Provenance } from './import-client';

export type SavedTab = MarkerState & { id: string; file: File; playbackFile: File; position: number; speed: number; pitchLocked?: boolean; volume: number; muted: boolean; view: VideoViewState; provenance?: Provenance; importId?: string };
export type Workspace = { active: string | null; tabs: SavedTab[] };
type FileRecord = { blob: Blob; name: string; modified: number };
type TabRecord = Omit<SavedTab, 'file' | 'playbackFile'> & { converted: boolean };
const request = <T>(req: IDBRequest<T>) => new Promise<T>((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
const completed = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error ?? new Error('storage transaction aborted')); tx.onerror = () => {}; });
const pack = (file: File): FileRecord => ({ blob: file, name: file.name, modified: file.lastModified });
const unpack = (record: FileRecord) => new File([record.blob], record.name, { type: record.blob.type, lastModified: record.modified });

/** Media blobs are written once. Frequent edits only update the small workspace record. */
export class WorkspaceStorage {
  private database: Promise<IDBDatabase> | null = null;
  private files = new Map<string, File>();
  private queue: Promise<unknown> = Promise.resolve();
  private name: string;
  private factory: IDBFactory | undefined;
  constructor(name = 'velhoksi-wait-v1', factory: IDBFactory | undefined = globalThis.indexedDB) { this.name = name; this.factory = factory; }
  private open() {
    if (!this.database) this.database = new Promise<IDBDatabase>((resolve, reject) => {
      if (!this.factory) { reject(new Error('browser storage unavailable')); return; }
      const req = this.factory.open(this.name, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore('files'); req.result.createObjectStore('workspace'); };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('browser storage is blocked'));
      req.onsuccess = () => { req.result.onversionchange = () => req.result.close(); resolve(req.result); };
    });
    return this.database;
  }
  async load(): Promise<Workspace> {
    const db = await this.open(), tx = db.transaction(['files', 'workspace'], 'readonly'), done = completed(tx);
    const metadata = request(tx.objectStore('workspace').get('current'));
    const records = request(tx.objectStore('files').getAll());
    const keys = request(tx.objectStore('files').getAllKeys());
    const [state, values, ids] = await Promise.all([metadata, records, keys, done]);
    const files = new Map(ids.map((id, i) => [String(id), unpack(values[i])])); this.files = files;
    const tabs: SavedTab[] = [];
    for (const tab of (state?.tabs ?? []) as TabRecord[]) {
      const file = files.get(`${tab.id}:original`), converted = files.get(`${tab.id}:converted`);
      if (!file) continue;
      const { converted: _, ...rest } = tab;
      tabs.push({ ...rest, file, playbackFile: converted ?? file });
    }
    return { active: state?.active ?? null, tabs };
  }
  clear(): Promise<void> {
    const result = this.queue.then(async () => {
      const db = await this.open(), tx = db.transaction(['files', 'workspace'], 'readwrite'), done = completed(tx);
      tx.objectStore('files').clear(); tx.objectStore('workspace').clear();
      await done; this.files.clear();
    });
    this.queue = result.catch(() => {}); return result;
  }
  save(workspace: Workspace): Promise<void> {
    // Capture edits now, before another save or file switch changes live objects.
    const snapshot = workspace.tabs.map(({ file, playbackFile, ...tab }) => ({ ...structuredClone(tab), file, playbackFile }));
    const active = workspace.active;
    const write = async () => {
      const db = await this.open(), tx = db.transaction(['files', 'workspace'], 'readwrite'), done = completed(tx);
      const store = tx.objectStore('files'), next = new Map<string, File>();
      const tabs = snapshot.map(({ file, playbackFile, ...tab }) => {
        next.set(`${tab.id}:original`, file);
        if (playbackFile !== file) next.set(`${tab.id}:converted`, playbackFile);
        return { ...tab, converted: playbackFile !== file };
      });
      try {
        for (const [id, file] of next) if (this.files.get(id) !== file) store.put(pack(file), id);
        for (const id of this.files.keys()) if (!next.has(id)) store.delete(id);
        tx.objectStore('workspace').put({ active, tabs }, 'current');
      } catch (error) { tx.abort(); await done.catch(() => {}); throw error; }
      await done; this.files = next;
    };
    const result = this.queue.then(write); this.queue = result.catch(() => {}); return result;
  }
}
