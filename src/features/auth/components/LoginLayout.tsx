import type { ReactNode } from "react";
import { CiviCheckIdentity } from "~/components/brand/civic-identity";
import { QuietLink as Link } from "~/components/quiet-link";
import { cn } from "~/lib/utils";
import "../login.css";

export function LoginLayout({
  children,
  loading = false,
}: {
  children: ReactNode;
  loading?: boolean;
}) {
  return (
    <div
      className="login-page"
      data-page-skeleton={loading || undefined}
      role={loading ? "status" : undefined}
      aria-label={loading ? "Loading sign-in page" : undefined}
      aria-busy={loading || undefined}
    >
      <div className="login-container">
        <header
          className={cn("login-header", !loading && "civic-enter-fade")}
          aria-hidden={loading || undefined}
        >
          {loading ? (
            <div className="login-home">
              <CiviCheckIdentity compact className="login-identity" />
            </div>
          ) : (
            <Link to="/" aria-label="CiviCheck home" className="login-home">
              <CiviCheckIdentity compact className="login-identity" />
            </Link>
          )}
        </header>

        <main className="login-main">
          <div className={cn("login-form-column", !loading && "civic-enter-fade")}>
            {children}
          </div>
          <div
            className={cn("login-artwork", !loading && "civic-enter-fade")}
            aria-hidden="true"
          >
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
