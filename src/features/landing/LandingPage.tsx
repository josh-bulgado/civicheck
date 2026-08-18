import { Reveal } from "~/components/motion/reveal";
import type { FeaturedChecklist } from "./landing.queries";
import HeroSection from "./components/HeroSection";
import HowItWorksSection from "./components/HowItWorksSection";
import ServicesSection from "./components/ServicesSection";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";

type LandingPageProps = {
  featuredChecklists: FeaturedChecklist[];
};

const LandingPage = ({ featuredChecklists }: LandingPageProps) => {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        {/*
          Three sections, in the order a resident actually needs them: what a
          checklist looks like, which document they want, and what happens
          after they submit. The old Why / About / CTA sections restated all
          three of those, so they were dropped rather than trimmed — the page
          argues its case by showing a real checklist in the hero, not by
          listing benefits.

          The hero is on screen at load, so it animates itself with the pure-CSS
          entrance classes. Everything below has to be scrolled to, which is what
          `Reveal` is for — each section arrives as the reader reaches it rather
          than all of them having already played off screen.
        */}
        <HeroSection checklists={featuredChecklists} />
        <Reveal>
          <ServicesSection />
        </Reveal>
        <Reveal>
          <HowItWorksSection />
        </Reveal>
      </main>
      <Reveal>
        <SiteFooter />
      </Reveal>
    </div>
  );
};

export default LandingPage;
