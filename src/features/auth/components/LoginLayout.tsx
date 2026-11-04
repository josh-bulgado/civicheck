import type { ReactNode } from "react";
import { CiviCheckIdentity } from "~/components/brand/civic-identity";
import { QuietLink as Link } from "~/components/quiet-link";

export function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className="login-page">
      <div className="login-container">
        <header className="login-header civic-enter-fade">
          <Link to="/" aria-label="CiviCheck home" className="login-home">
            <CiviCheckIdentity compact className="login-identity" />
          </Link>
        </header>

        <main className="login-main">
          <div className="login-form-column civic-enter">{children}</div>
          <div className="login-artwork civic-enter-fade" aria-hidden="true">
            <img
              src="/login/login-documents.webp"
              width={660}
              height={495}
              alt=""
              draggable={false}
              decoding="async"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
