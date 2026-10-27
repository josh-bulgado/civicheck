import { QuietLink as Link } from "~/components/quiet-link";
import { CityGovernmentIdentity, CiviCheckIdentity } from "~/components/brand/civic-identity";

const SiteFooter = () => (
  <footer className="landing-footer">
    <div className="landing-footer-main">
      <div className="landing-footer-about">
        <CiviCheckIdentity />
        <p>
          The City Civil Registrar Office (CCRO) of Legazpi City registers and
          issues official birth, marriage, death, and other civil registry records.
        </p>
      </div>
      <div>
        <h2>Public services</h2>
        <ul>
          <li><Link to="/requirements">Check requirements</Link></li>
          <li><Link to="/requirements">Submit a request</Link></li>
          <li><Link to="/track">Track a request</Link></li>
        </ul>
      </div>
      <div className="landing-footer-office">
        <h2>Office</h2>
        <p>City Civil Registrar Office<br />City Government of Legazpi</p>
        <p className="landing-office-note">
          Office address, hours, and contact details to be confirmed with CCRO.
        </p>
      </div>
    </div>
    <div className="landing-footer-bottom">
      <div className="landing-footer-bottom-inner">
        <CityGovernmentIdentity className="landing-footer-city" />
        <nav aria-label="Legal">
          <Link to="/terms">Terms of Use</Link>
          <Link to="/privacy">Privacy Notice</Link>
        </nav>
      </div>
    </div>
  </footer>
);

export default SiteFooter;
