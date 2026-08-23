import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/apply/$serviceCode/")({
  loader: ({ params }) => {
    throw redirect({
      to: "/apply/$serviceCode/case",
      params: { serviceCode: params.serviceCode },
    });
  },
});
