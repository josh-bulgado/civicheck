import type { Service } from "../services.types";
import { ServicesPageHeader } from "../components/ServicesPageHeader";
import { ServicesTableSection } from "../components/ServicesTableSection";

interface ServicesPageProps {
  services: Service[];
}

const ServicesPage = ({ services }: ServicesPageProps) => {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      <ServicesPageHeader />
      <ServicesTableSection services={services} />
    </div>
  );
};

export default ServicesPage;
