import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export interface StoredFileRef {
  storageKey: string;
  storageUrl: string | null;
}

/**
 * Swappable storage seam. v0.1 ships a local-disk implementation for dev;
 * production deploys should implement this against S3/GCS/R2 and switch via
 * STORAGE_DRIVER — nothing above this interface needs to change.
 */
export interface StorageService {
  save(params: { buffer: Buffer; filename: string; mimeType: string }): Promise<StoredFileRef>;
}

class LocalDiskStorageService implements StorageService {
  private readonly basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async save(params: { buffer: Buffer; filename: string; mimeType: string }): Promise<StoredFileRef> {
    await mkdir(this.basePath, { recursive: true });
    const key = `${randomUUID()}-${params.filename}`;
    await writeFile(path.join(this.basePath, key), params.buffer);
    return { storageKey: key, storageUrl: null };
  }
}

// S3StorageService would live here in Phase 1 (docs/ROADMAP.md) — same
// interface, swapped in via the STORAGE_DRIVER env var below.
function buildStorageService(): StorageService {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "local") {
    return new LocalDiskStorageService(process.env.STORAGE_LOCAL_PATH ?? "./.uploads");
  }
  throw new Error(
    `STORAGE_DRIVER="${driver}" is not implemented yet. See docs/ROADMAP.md Phase 1 for the S3 seam.`,
  );
}

export const storageService = buildStorageService();
