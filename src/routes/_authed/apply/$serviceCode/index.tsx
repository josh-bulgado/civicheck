import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/apply/$serviceCode/")({
  loader: ({ params }) => {
    throw redirect({
      to: "/apply/$serviceCode/details",
      params: { serviceCode: params.serviceCode },
    });
  },
});
