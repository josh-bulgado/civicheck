import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/apply/")({
  loader: () => {
    throw redirect({ to: "/requirements" });
  },
});
