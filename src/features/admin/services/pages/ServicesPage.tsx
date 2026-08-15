import type { Service } from "../services.types";
import { ServicesPageHeader } from "../components/ServicesPageHeader";
import { ServicesStatsCards } from "../components/ServicesStatsCards";
import { ServicesTableSection } from "../components/ServicesTableSection";

interface ServicesPageProps {
  services: Service[];
}

const ServicesPage = ({ services }: ServicesPageProps) => {
  return (
    <div className="dashboard-page animate-in fade-in duration-300">
      <ServicesPageHeader />
      <ServicesStatsCards data={services} />
      <ServicesTableSection services={services} />
    </div>
  );
};

export default ServicesPage;
