import { z } from "zod";
import { strongPasswordSchema } from "../auth.schema";

export const acceptInvitationInputSchema = z.object({
  password: strongPasswordSchema,
});

export const acceptInvitationFormSchema = acceptInvitationInputSchema
  .extend({
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine(({ password, confirmPassword }) => password === confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type AcceptInvitationFormValues = z.infer<
  typeof acceptInvitationFormSchema
>;
