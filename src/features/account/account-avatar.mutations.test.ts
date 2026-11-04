import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  read: vi.fn(),
  update: vi.fn(),
  filters: vi.fn(),
  write: vi.fn(),
  remove: vi.fn(),
  bucket: vi.fn(),
  forget: vi.fn(),
  path: "applicant-id/photo.jpg" as string | null,
  files: new Set<string>(),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      validator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("~/server/auth", () => ({ requireActiveSession: mocks.requireSession }));
vi.mock("~/server/avatar", () => ({ AVATAR_BUCKET: "avatars", forgetAvatarUrl: mocks.forget }));
vi.mock("~/utils/supabase", () => ({ getSupabaseStatelessClient: vi.fn() }));
vi.mock("./account-audit.server", () => ({ recordPasswordChanged: vi.fn() }));

import { removeMyAvatarFn } from "./account.mutations";

const originalPath = "applicant-id/photo.jpg";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.path = originalPath;
  mocks.files = new Set([originalPath, "other-user/photo.jpg"]);
  mocks.read.mockImplementation(async () => ({ data: { avatar_path: mocks.path }, error: null }));
  mocks.remove.mockImplementation(async (paths: string[]) => {
    paths.forEach((path) => mocks.files.delete(path));
    return { error: null };
  });
  mocks.write.mockImplementation(async () => {
    mocks.path = null;
    return { error: null };
  });

  const query = {
    select: () => query,
    eq: (column: string, value: string) => { mocks.filters(column, value); return query; },
    single: mocks.read,
    update: (values: unknown) => { mocks.update(values); return query; },
    then: (resolve: (result: unknown) => unknown) => mocks.write().then(resolve),
  };
  mocks.bucket.mockReturnValue({ remove: mocks.remove });
  mocks.requireSession.mockResolvedValue({
    user: { id: "applicant-id" },
    supabase: { from: () => query, storage: { from: mocks.bucket } },
  });
});

describe("permanent profile photo removal", () => {
  it("deletes the storage object before clearing its profile reference", async () => {
    expect((await removeMyAvatarFn()).error).toBe(false);
    expect(mocks.bucket).toHaveBeenCalledWith("avatars");
    expect(mocks.remove).toHaveBeenCalledWith([originalPath]);
    expect(mocks.files.has(originalPath)).toBe(false);
    expect(mocks.files.has("other-user/photo.jpg")).toBe(true);
    expect(mocks.path).toBeNull();
    expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(mocks.update.mock.invocationCallOrder[0]);
    expect(mocks.filters).toHaveBeenCalledWith("id", "applicant-id");
    expect(mocks.filters).toHaveBeenCalledWith("avatar_path", originalPath);
    expect(mocks.forget).toHaveBeenCalledWith(originalPath);
  });

  it("keeps the file reference and reports failure when Storage cannot delete it", async () => {
    mocks.remove.mockResolvedValueOnce({ error: new Error("Storage unavailable") });
    const result = await removeMyAvatarFn();
    expect(result.error).toBe(true);
    expect(result.message).toContain("permanently deleted");
    expect(mocks.path).toBe(originalPath);
    expect(mocks.files.has(originalPath)).toBe(true);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.forget).not.toHaveBeenCalled();

    expect((await removeMyAvatarFn()).error).toBe(false);
    expect(mocks.files.has(originalPath)).toBe(false);
    expect(mocks.path).toBeNull();
  });

  it("does not mistake a failed profile lookup for an already removed photo", async () => {
    mocks.read.mockResolvedValueOnce({ data: null, error: new Error("Database unavailable") });
    expect((await removeMyAvatarFn()).error).toBe(true);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("can retry unlinking after deletion succeeds but the database write fails", async () => {
    mocks.write.mockResolvedValueOnce({ error: new Error("Database unavailable") });
    expect((await removeMyAvatarFn()).error).toBe(true);
    expect(mocks.files.has(originalPath)).toBe(false);
    expect(mocks.path).toBe(originalPath);

    expect((await removeMyAvatarFn()).error).toBe(false);
    expect(mocks.path).toBeNull();
  });

  it("is a no-op once the photo has already been removed", async () => {
    mocks.path = null;
    expect((await removeMyAvatarFn()).error).toBe(false);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("requires a signed-in session before accessing the profile or Storage", async () => {
    mocks.requireSession.mockRejectedValueOnce(new Error("Unauthorized"));
    await expect(removeMyAvatarFn()).rejects.toThrow("Unauthorized");
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
