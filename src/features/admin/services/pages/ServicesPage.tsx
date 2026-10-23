import { useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Blocks, Plus } from "lucide-react";
import { buttonVariants } from "~/components/ui/button";
import { PageHeaderCard } from "~/components/ui/page-header-card";
import type { Service } from "../services.types";
import { ServicesDataTable } from "../components/ServicesDataTable";
import {
  buildServiceDossiers,
  type ServiceDossier,
} from "../components/ServicesColumn";
import type { Department } from "~/features/admin/departments.queries";

interface ServicesPageProps {
  services: Service[];
  departments: Department[];
}

const ServicesPage = ({ services, departments }: ServicesPageProps) => {
  const navigate = useNavigate();
  const dossiers = useMemo(() => buildServiceDossiers(services), [services]);

  const openEditor = (service: ServiceDossier) => {
    if (service.variant_count > 1) {
      navigate({
        to: "/admin/services/groups/$displayGroup",
        params: { displayGroup: service.dossier_key },
        search: { scope: undefined },
      });
    } else {
      navigate({
        to: "/admin/services/$serviceCode/edit",
        params: { serviceCode: service.service_code },
      });
    }
  };

  return (
    <div className="dashboard-page">
      <PageHeaderCard
        title="Services"
        description={`CCRO Administration, ${dossiers.length} services`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/services/blocks"
            search={{ block: undefined }}
            className={buttonVariants({ variant: "ghost", size: "lg" })}
          >
            <Blocks aria-hidden="true" data-icon="inline-start" />
            Shared Question Blocks
          </Link>
          <Link
            to="/admin/services/new"
            className={buttonVariants({ variant: "raised", size: "lg" })}
          >
            <Plus aria-hidden="true" data-icon="inline-start" />
            Add Service
          </Link>
        </div>
      </PageHeaderCard>
      <ServicesDataTable
        data={dossiers}
        departments={departments}
        onEdit={openEditor}
      />
    </div>
  );
};

export default ServicesPage;
