import type { FeaturedChecklist } from "./landing.queries";
import HeroSection from "./components/HeroSection";
import HowItWorksSection from "./components/HowItWorksSection";
import SiteFooter from "./components/SiteFooter";

type LandingPageProps = {
  featuredChecklists: FeaturedChecklist[];
};

const LandingPage = ({ featuredChecklists }: LandingPageProps) => (
  <div className="landing-page">
    <main>
      <HeroSection checklists={featuredChecklists} />
      <HowItWorksSection />
    </main>
    <SiteFooter />
  </div>
);

export default LandingPage;
