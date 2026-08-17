import { Reveal } from "~/components/motion/reveal";
import type { FeaturedChecklist } from "./landing.queries";
import AboutSection from "./components/AboutSection";
import CtaBandSection from "./components/CtaBandSection";
import HeroSection from "./components/HeroSection";
import HowItWorksSection from "./components/HowItWorksSection";
import QueueTeaserSection from "./components/QueueTeaserSection";
import ServicesSection from "./components/ServicesSection";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";
import WhyCiviCheckSection from "./components/WhyCiviCheckSection";

type LandingPageProps = {
  featuredChecklist: FeaturedChecklist | null;
};

const LandingPage = ({ featuredChecklist }: LandingPageProps) => {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        {/*
          The hero is on screen at load, so it animates itself with the pure-CSS
          entrance classes. Everything below has to be scrolled to, which is what
          `Reveal` is for — each section arrives as the reader reaches it rather
          than all of them having already played off screen.
        */}
        <HeroSection checklist={featuredChecklist} />
        <Reveal>
          <ServicesSection />
        </Reveal>
        <Reveal>
          <HowItWorksSection />
        </Reveal>
        <Reveal>
          <WhyCiviCheckSection />
        </Reveal>
        <Reveal>
          <QueueTeaserSection />
        </Reveal>
        <Reveal>
          <AboutSection />
        </Reveal>
        <Reveal>
          <CtaBandSection />
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
};

export default LandingPage;
