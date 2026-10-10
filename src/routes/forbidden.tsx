import { createFileRoute } from "@tanstack/react-router";
import { Forbidden } from "~/components/Forbidden";

type ForbiddenSearch = {
  from?: string;
};

export const Route = createFileRoute("/forbidden")({
  // `from` is only ever rendered as text and handed to the login redirect, so
  // keep it to a same-site absolute path — never `//host` or a full URL.
  validateSearch: (search: Record<string, unknown>): ForbiddenSearch => {
    const from = typeof search.from === "string" ? search.from : undefined;
    return {
      from:
        from && from.startsWith("/") && !from.startsWith("//")
          ? from
          : undefined,
    };
  },
  head: () => ({
    meta: [{ title: "Access restricted — CiviCheck" }],
  }),
  component: ForbiddenRoute,
});

function ForbiddenRoute() {
  const { from } = Route.useSearch();
  return <Forbidden from={from} />;
}
