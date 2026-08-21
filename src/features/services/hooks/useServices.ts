import { Route } from "~/routes/_authed/_dashboard/(service)/services";

export function useServices() {
  return Route.useLoaderData();
}
