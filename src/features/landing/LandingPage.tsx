import AboutBanner from "./components/AboutBanner";
import HeroSection from "./components/HeroSection";
import HowItWorksSection from "./components/HowItWorksSection";
import ServicesSection from "./components/ServicesSection";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";
import WhyCiviCheckSection from "./components/WhyCiviCheckSection";

const LandingPage = () => {
  return (
    <div
      className="min-h-screen bg-white"
      style={{
        fontFamily:
          "'Source Sans Pro', 'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}
    >
      <SiteHeader />
      <main>
        <HeroSection />
        <AboutBanner />
        <HowItWorksSection />
        <ServicesSection />
        <WhyCiviCheckSection />
      </main>
      <SiteFooter />
    </div>
  );
};

export default LandingPage;
