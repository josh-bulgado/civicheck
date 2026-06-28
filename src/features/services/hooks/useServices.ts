import { Route } from "~/routes/_authed/(service)/services";

export function useServices() {
  return Route.useLoaderData();
}
