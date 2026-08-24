import type { Service } from "../services.types";
import { ServicesPageHeader } from "../components/ServicesPageHeader";
import { ServicesStatsCards } from "../components/ServicesStatsCards";
import { ServicesTableSection } from "../components/ServicesTableSection";
import { buildServiceDossiers } from "../components/ServicesColumn";

interface ServicesPageProps {
  services: Service[];
}

const ServicesPage = ({ services }: ServicesPageProps) => {
  const dossiers = buildServiceDossiers(services);
  return (
    <div className="dashboard-page">
      <ServicesPageHeader />
      <ServicesStatsCards data={dossiers} />
      <ServicesTableSection services={dossiers} />
    </div>
  );
};

export default ServicesPage;
