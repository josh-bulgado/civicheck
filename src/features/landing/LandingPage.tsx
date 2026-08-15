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
        <HeroSection checklist={featuredChecklist} />
        <ServicesSection />
        <HowItWorksSection />
        <WhyCiviCheckSection />
        <QueueTeaserSection />
        <AboutSection />
        <CtaBandSection />
      </main>
      <SiteFooter />
    </div>
  );
};

export default LandingPage;
