import type { Service } from "../services.types";
import { ServicesPageHeader } from "../components/ServicesPageHeader";
import { ServicesStatsCards } from "../components/ServicesStatsCards";
import { ServicesTableSection } from "../components/ServicesTableSection";
import { buildServiceDossiers } from "../components/ServicesColumn";
import type { Department } from "~/features/admin/departments.queries";

interface ServicesPageProps {
  services: Service[];
  departments: Department[];
}

const ServicesPage = ({ services, departments }: ServicesPageProps) => {
  const dossiers = buildServiceDossiers(services);
  return (
    <div className="dashboard-page">
      <ServicesPageHeader />
      <ServicesStatsCards data={dossiers} />
      <ServicesTableSection services={dossiers} departments={departments} />
    </div>
  );
};

export default ServicesPage;
