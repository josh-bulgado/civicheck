import HeroSection from "./components/HeroSection";
import HowItWorksSection from "./components/HowItWorksSection";
import QueueTeaserSection from "./components/QueueTeaserSection";
import ServicesSection from "./components/ServicesSection";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <HeroSection />
        <ServicesSection />
        <HowItWorksSection />
        <QueueTeaserSection />
      </main>
      <SiteFooter />
    </div>
  );
};

export default LandingPage;
