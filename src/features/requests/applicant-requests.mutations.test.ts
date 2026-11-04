import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  history: [] as unknown[],
  attachment: null as Record<string, unknown> | null,
  conflict: false,
  uploadError: null as { message: string } | null,
  remove: vi.fn(async () => ({ error: null })),
  sign: vi.fn(async () => ({ data: { signedUrl: "signed-link" }, error: null })),
  filters: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (validate: ((data: unknown) => unknown) | { parse: (data: unknown) => unknown }) => ({
      handler: (handler: (input: { data: unknown }) => unknown) => (input: { data: unknown }) =>
        handler({ data: typeof validate === "function" ? validate(input.data) : validate.parse(input.data) }),
    }),
  }),
}));
vi.mock("~/features/requests/missing-uploads.server", () => ({ loadAddableUploads: vi.fn() }));
vi.mock("~/server/auth", () => ({
  requireActiveSession: async () => ({
    user: { id: "applicant" },
    supabase: {
      from: () => {
        const query = {
          select: () => query,
          eq: (...args: unknown[]) => { state.filters(...args); return query; },
          maybeSingle: async () => ({ data: state.attachment, error: null }),
        };
        return query;
      },
      storage: { from: () => ({
        upload: async () => ({ error: state.uploadError }),
        createSignedUrl: state.sign,
      }) },
    },
  }),
}));
vi.mock("~/utils/supabase", () => ({
  getSupabaseAdminClient: () => ({
    from: () => {
      const query = {
        update: (values: unknown) => { state.update(values); return query; },
        eq: (...args: unknown[]) => { state.filters(...args); return query; },
        select: async () => ({ data: state.conflict ? [] : [{ id: "attachment", previous_uploads: state.history }], error: null }),
        insert: async () => ({ error: null }),
      };
      return query;
    },
    storage: { from: () => ({ remove: state.remove }) },
  }),
}));

import { getMyAttachmentSignedUrlFn, resubmitOwnAttachmentFn } from "./applicant-requests.mutations";

const previous = {
  fileUrl: "applicant/old.pdf", rejectionReason: "Blurry",
  uploadedAt: "2026-11-01T00:00:00Z", replacedAt: "2026-11-04T00:00:00Z",
};
const resubmit = () => {
  const data = new FormData();
  data.set("attachmentId", "attachment");
  data.set("file", new File(["pdf"], "new.pdf", { type: "application/pdf" }));
  return resubmitOwnAttachmentFn({ data });
};

beforeEach(() => {
  vi.clearAllMocks();
  state.history = [previous];
  state.conflict = false;
  state.uploadError = null;
  state.attachment = {
    id: "attachment", request_id: "request", requirement_name: "Death Certificate",
    file_url: previous.fileUrl, verification_status: "rejected",
    previous_uploads: state.history, requests: { applicant_id: "applicant", status: "incomplete" },
  };
});

describe("applicant replacement file handling", () => {
  it("keeps an archived rejected file and resets only the current decision", async () => {
    expect(await resubmit()).toEqual({ error: false });
    expect(state.remove).not.toHaveBeenCalled();
    expect(state.update).toHaveBeenCalledWith(expect.objectContaining({
      verification_status: "pending", rejection_reason: null,
    }));
    expect(state.filters).toHaveBeenCalledWith("file_url", previous.fileUrl);
    expect(state.filters).toHaveBeenCalledWith("requests.applicant_id", "applicant");
  });

  it("preserves cleanup for services without upload history", async () => {
    state.history = [];
    expect(await resubmit()).toEqual({ error: false });
    expect(state.remove).toHaveBeenCalledWith([previous.fileUrl]);
  });

  it("cleans up only the new file if a concurrent replacement wins", async () => {
    state.conflict = true;
    expect(await resubmit()).toMatchObject({ error: true });
    expect(state.remove).toHaveBeenCalledWith([expect.stringContaining("/resubmissions/request/attachment/")]);
    expect(state.remove).not.toHaveBeenCalledWith([previous.fileUrl]);
  });

  it("leaves history and the current file intact if uploading fails", async () => {
    state.uploadError = { message: "Upload failed" };
    expect(await resubmit()).toEqual({ error: true, message: "Upload failed" });
    expect(state.update).not.toHaveBeenCalled();
    expect(state.remove).not.toHaveBeenCalled();
  });

  it("blocks replacements on a closed request", async () => {
    state.attachment!.requests = { status: "released" };
    expect(await resubmit()).toMatchObject({ error: true });
    expect(state.update).not.toHaveBeenCalled();
  });
});

describe("viewing a previous upload", () => {
  it("signs a stored version after checking applicant ownership", async () => {
    expect(await getMyAttachmentSignedUrlFn({ data: { attachmentId: "00000000-0000-4000-8000-000000000001", previousIndex: 0 } }))
      .toEqual({ error: false, url: "signed-link" });
    expect(state.filters).toHaveBeenCalledWith("requests.applicant_id", "applicant");
    expect(state.sign).toHaveBeenCalledWith(previous.fileUrl, 300);
  });

  it("does not sign an invalid version or an inaccessible attachment", async () => {
    expect(await getMyAttachmentSignedUrlFn({ data: { attachmentId: "00000000-0000-4000-8000-000000000001", previousIndex: 9 } }))
      .toMatchObject({ error: true });
    state.attachment = null;
    expect(await getMyAttachmentSignedUrlFn({ data: { attachmentId: "00000000-0000-4000-8000-000000000001", previousIndex: 0 } }))
      .toMatchObject({ error: true });
    expect(state.sign).not.toHaveBeenCalled();
  });
});
