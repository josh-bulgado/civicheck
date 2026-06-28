import { Route } from "~/routes/_authed/services";

export function useServices() {
  return Route.useLoaderData();
}
