import type { Department } from "../../departments.queries";
import type { Service } from "../services.types";
import { ServicesPageHeader } from "../components/ServicesPageHeader";
import { ServicesStatsCards } from "../components/ServicesStatsCards";
import { ServicesTableSection } from "../components/ServicesTableSection";

interface ServicesPageProps {
  services: Service[];
  departments: Department[];
}

const ServicesPage = ({ services, departments }: ServicesPageProps) => {
  return (
    <div className="dashboard-page">
      <ServicesPageHeader />
      <ServicesStatsCards data={services} />
      <ServicesTableSection services={services} departments={departments} />
    </div>
  );
};

export default ServicesPage;
