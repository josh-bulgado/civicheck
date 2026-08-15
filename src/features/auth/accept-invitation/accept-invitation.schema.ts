import { z } from "zod";

export const acceptInvitationInputSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters."),
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
