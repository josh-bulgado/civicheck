import type { Department } from "~/features/admin/departments.queries";
import type { EncodableService } from "./walk-in-intake.queries";

export const REQUEST_QUEUE_METADATA_TTL_MS = 5 * 60_000;

export interface RequestQueueMetadata {
  departments: Department[];
  scope: {
    isScoped: boolean;
    departmentId: string | null;
    departmentName: string | null;
  };
  services: EncodableService[];
}

let entry: {
  key: string;
  promise: Promise<RequestQueueMetadata>;
  expiresAt: number;
} | null = null;

export function requestQueueMetadataKey(
  userId: string,
  role: string,
  canEncode: boolean,
) {
  return `${userId}:${role}:${canEncode ? "encode" : "read"}`;
}

/**
 * The queue changes constantly; its departments, viewer scope and walk-in
 * services do not. Keep those supporting reads in this tab so filtering the
 * queue only asks the server for rows. Server renders always read through to
 * avoid sharing one account's metadata with another request.
 */
export function readRequestQueueMetadata(
  key: string,
  load: () => Promise<RequestQueueMetadata>,
): Promise<RequestQueueMetadata> {
  if (typeof window === "undefined") return load();
  if (entry?.key === key && entry.expiresAt > Date.now()) return entry.promise;

  const promise = load()
    .then((metadata) => {
      if (entry?.promise === promise) {
        entry.expiresAt = Date.now() + REQUEST_QUEUE_METADATA_TTL_MS;
      }
      return metadata;
    })
    .catch((error) => {
      if (entry?.promise === promise) entry = null;
      throw error;
    });

  entry = { key, promise, expiresAt: Number.POSITIVE_INFINITY };
  return promise;
}

/** Seed the browser cache from the metadata already delivered by SSR. */
export function primeRequestQueueMetadata(
  key: string,
  metadata: RequestQueueMetadata,
) {
  if (typeof window === "undefined") return;
  entry = {
    key,
    promise: Promise.resolve(metadata),
    expiresAt: Date.now() + REQUEST_QUEUE_METADATA_TTL_MS,
  };
}

export function clearRequestQueueMetadata() {
  entry = null;
}
