import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  REQUEST_QUEUE_METADATA_TTL_MS,
  clearRequestQueueMetadata,
  primeRequestQueueMetadata,
  readRequestQueueMetadata,
  type RequestQueueMetadata,
} from "./request-queue-metadata.cache";

const metadata: RequestQueueMetadata = {
  departments: [],
  scope: {
    isScoped: true,
    departmentId: "records",
    departmentName: "Records",
  },
  services: [],
};

beforeEach(() => {
  vi.stubGlobal("window", {});
  vi.useFakeTimers();
  clearRequestQueueMetadata();
});

afterEach(() => {
  clearRequestQueueMetadata();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("request queue metadata cache", () => {
  it("shares warm and concurrent reads for the same viewer", async () => {
    const load = vi.fn().mockResolvedValue(metadata);
    const first = readRequestQueueMetadata("viewer", load);
    const second = readRequestQueueMetadata("viewer", load);

    expect(first).toBe(second);
    await first;
    await readRequestQueueMetadata("viewer", load);
    expect(load).toHaveBeenCalledOnce();
  });

  it("expires metadata and isolates a different viewer", async () => {
    const load = vi.fn().mockResolvedValue(metadata);
    await readRequestQueueMetadata("viewer-a", load);
    await readRequestQueueMetadata("viewer-b", load);
    vi.advanceTimersByTime(REQUEST_QUEUE_METADATA_TTL_MS + 1);
    await readRequestQueueMetadata("viewer-b", load);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it("uses SSR data without another browser read", async () => {
    const load = vi.fn().mockResolvedValue(metadata);
    primeRequestQueueMetadata("viewer", metadata);
    await readRequestQueueMetadata("viewer", load);
    expect(load).not.toHaveBeenCalled();
  });

  it("never shares metadata between server requests", async () => {
    vi.stubGlobal("window", undefined);
    const load = vi.fn().mockResolvedValue(metadata);
    await readRequestQueueMetadata("viewer", load);
    await readRequestQueueMetadata("viewer", load);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
