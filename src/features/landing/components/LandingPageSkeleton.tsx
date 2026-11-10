import LandingPage from "../LandingPage";
import SiteHeader from "./SiteHeader";

/** The public page is static apart from the current service requirements. */
export function LandingPageSkeleton() {
  return <div data-page-skeleton><SiteHeader /><LandingPage featuredChecklists={[]} loading /></div>;
}
