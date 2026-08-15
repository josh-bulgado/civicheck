import AboutBanner from "./components/AboutBanner";
import HeroSection from "./components/HeroSection";
import HowItWorksSection from "./components/HowItWorksSection";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";
import WhyCiviCheckSection from "./components/WhyCiviCheckSection";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <WhyCiviCheckSection />
        <AboutBanner />
      </main>
      <SiteFooter />
    </div>
  );
};

export default LandingPage;
