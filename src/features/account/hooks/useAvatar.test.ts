import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAvatar } from "./useAvatar";

const mocks = vi.hoisted(() => ({
  states: [] as unknown[],
  cursor: 0,
  effect: undefined as (() => () => void) | undefined,
  invalidate: vi.fn(),
  clearCurrentUser: vi.fn(),
  upload: vi.fn(),
  setAvatar: vi.fn(),
  removeAvatar: vi.fn(),
  prepare: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock("react", () => ({
  useState: (initial: unknown) => {
    const index = mocks.cursor++;
    if (!(index in mocks.states)) mocks.states[index] = initial;
    return [mocks.states[index], (value: unknown) => { mocks.states[index] = value; }];
  },
  useEffect: (effect: () => () => void) => { mocks.effect = effect; },
}));
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ invalidate: mocks.invalidate }),
}));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock("~/features/auth/current-user", () => ({ clearCurrentUser: mocks.clearCurrentUser }));
vi.mock("~/lib/avatar-image", async (importOriginal) => ({
  ...await importOriginal<typeof import("~/lib/avatar-image")>(),
  prepareAvatar: mocks.prepare,
}));
vi.mock("~/utils/supabase-browser", () => ({
  getSupabaseBrowserClient: async () => ({ storage: { from: () => ({ upload: mocks.upload }) } }),
}));
vi.mock("../account.mutations", () => ({
  setMyAvatarFn: mocks.setAvatar,
  removeMyAvatarFn: mocks.removeAvatar,
}));

function AvatarHarness(savedUrl: string | null = null) {
  mocks.cursor = 0;
  return useAvatar("applicant-id", savedUrl);
}

const photo = () => new File(["photo"], "photo.png", { type: "image/png" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.states = [];
  mocks.upload.mockResolvedValue({ error: null });
  mocks.setAvatar.mockResolvedValue({ error: false, message: "Profile photo updated." });
  mocks.removeAvatar.mockResolvedValue({ error: false, message: "Profile photo removed." });
  mocks.prepare.mockResolvedValue(new Blob(["prepared"], { type: "image/jpeg" }));
});

afterEach(() => {
  mocks.effect?.()();
});

describe("profile photo changes", () => {
  it("previews a selected photo as an unsaved change without uploading it", () => {
    AvatarHarness().select(photo());
    const avatar = AvatarHarness();
    expect(avatar.isDirty).toBe(true);
    expect(avatar.avatarUrl).toMatch(/^blob:/);
    expect(mocks.prepare).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.setAvatar).not.toHaveBeenCalled();
  });

  it("uploads and attaches the photo only when saved, then refreshes the identity", async () => {
    AvatarHarness().select(photo());
    expect(await AvatarHarness().save()).toBe(true);
    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^applicant-id\/.+\.jpg$/),
      expect.any(Blob),
      { contentType: "image/jpeg", cacheControl: "3600" },
    );
    expect(mocks.setAvatar).toHaveBeenCalledWith({ data: { path: mocks.upload.mock.calls[0][0] } });
    expect(mocks.clearCurrentUser).toHaveBeenCalledOnce();
    expect(mocks.invalidate).toHaveBeenCalledOnce();
    expect(AvatarHarness("saved-photo").isDirty).toBe(false);
    expect(AvatarHarness("saved-photo").avatarUrl).toBe("saved-photo");
  });

  it("stages removing an existing photo until Save changes", async () => {
    AvatarHarness("saved-photo").remove();
    const avatar = AvatarHarness("saved-photo");
    expect(avatar.isDirty).toBe(true);
    expect(avatar.avatarUrl).toBeNull();
    expect(mocks.removeAvatar).not.toHaveBeenCalled();
    expect(await avatar.save()).toBe(true);
    expect(mocks.removeAvatar).toHaveBeenCalledOnce();
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("returns to clean when a newly selected photo is removed from an empty profile", () => {
    AvatarHarness().select(photo());
    AvatarHarness().remove();
    expect(AvatarHarness().isDirty).toBe(false);
    expect(AvatarHarness().avatarUrl).toBeNull();
    expect(mocks.removeAvatar).not.toHaveBeenCalled();
  });

  it("releases the local preview on discard without changing the saved profile", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    AvatarHarness("saved-photo").select(photo());
    const avatar = AvatarHarness("saved-photo");
    mocks.effect?.()();
    expect(revoke).toHaveBeenCalledWith(avatar.avatarUrl);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.setAvatar).not.toHaveBeenCalled();
    expect(mocks.removeAvatar).not.toHaveBeenCalled();
    revoke.mockRestore();
  });

  it("keeps the photo pending for retry after an upload failure", async () => {
    mocks.upload.mockResolvedValue({ error: new Error("offline") });
    AvatarHarness().select(photo());
    expect(await AvatarHarness().save()).toBe(false);
    expect(AvatarHarness().isDirty).toBe(true);
    expect(AvatarHarness().pending).toBe(false);
    expect(mocks.setAvatar).not.toHaveBeenCalled();
    expect(mocks.invalidate).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalled();
  });

  it("keeps the draft after the server rejects the photo", async () => {
    mocks.setAvatar.mockResolvedValue({ error: true, message: "Unable to save." });
    AvatarHarness().select(photo());
    expect(await AvatarHarness().save()).toBe(false);
    expect(AvatarHarness().isDirty).toBe(true);
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });

  it("rejects unsupported files without creating an unsaved change", () => {
    AvatarHarness("saved-photo").select(new File(["text"], "photo.txt", { type: "text/plain" }));
    expect(AvatarHarness("saved-photo").isDirty).toBe(false);
    expect(AvatarHarness("saved-photo").avatarUrl).toBe("saved-photo");
    expect(mocks.error).toHaveBeenCalled();
  });
});
