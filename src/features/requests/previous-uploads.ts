import { z } from "zod";

const previousUploadSchema = z.object({
  fileUrl: z.string(),
  rejectionReason: z.string().nullable(),
  uploadedAt: z.string(),
  replacedAt: z.string(),
});

export type PreviousUpload = z.infer<typeof previousUploadSchema>;

export function parsePreviousUploads(value: unknown): PreviousUpload[] {
  return z.array(previousUploadSchema).parse(value ?? []);
}

export const attachmentVersionSchema = z.object({
  attachmentId: z.string().uuid(),
  previousIndex: z.number().int().nonnegative().optional(),
});
