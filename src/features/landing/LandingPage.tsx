import type { FeaturedChecklist } from "./landing.queries";
import HeroSection from "./components/HeroSection";
import HowItWorksSection from "./components/HowItWorksSection";
import SiteFooter from "./components/SiteFooter";
import { Reveal } from "~/components/motion/reveal";

type LandingPageProps = {
  featuredChecklists: FeaturedChecklist[];
};

const LandingPage = ({ featuredChecklists }: LandingPageProps) => (
  <div className="landing-page">
    <main>
      <HeroSection checklists={featuredChecklists} />
      <Reveal>
        <HowItWorksSection />
      </Reveal>
    </main>
    <SiteFooter />
  </div>
);

export default LandingPage;
