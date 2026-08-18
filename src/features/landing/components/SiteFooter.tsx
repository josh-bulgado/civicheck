import { Link } from "@tanstack/react-router";
import { CityGovernmentIdentity, CiviCheckIdentity } from "~/components/brand/civic-identity";

const SiteFooter = () => (
  <footer className="border-t border-border bg-white">
    <div className="civic-container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
      <div className="max-w-md">
        <CiviCheckIdentity />
        {/*
          The page no longer carries a standalone About section, so the office's
          own description lands here — it is context for the footer's contact
          block rather than a section a reader has to scroll past.
        */}
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          The City Civil Registrar Office (CCRO) of Legazpi City registers and
          issues official birth, marriage, death, and other civil registry
          records. CiviCheck was built to make that process clearer and faster
          for residents and staff alike, without changing how the office legally
          operates.
        </p>
      </div>

      <div>
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-foreground">Public services</h2>
        <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li><Link to="/requirements" className="hover:text-primary">Check requirements</Link></li>
          <li><Link to="/signup" className="hover:text-primary">Submit a request</Link></li>
          <li><Link to="/track" className="hover:text-primary">Track a request</Link></li>
        </ul>
      </div>

      <div>
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-foreground">Office</h2>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          City Civil Registrar Office<br />City Government of Legazpi
        </p>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Office address, hours, and contact details to be confirmed with CCRO.
        </p>
      </div>
    </div>

    <div className="border-t border-border bg-background">
      <div className="civic-container flex flex-col items-center justify-between gap-4 py-5 sm:flex-row">
        <CityGovernmentIdentity />
        <p className="text-center text-xs text-muted-foreground">
          CiviCheck · City Civil Registrar Office · Legazpi City
        </p>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
