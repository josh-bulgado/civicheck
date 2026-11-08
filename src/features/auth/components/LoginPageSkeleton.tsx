import { Skeleton } from "~/components/ui/skeleton";
import { LoginLayout } from "./LoginLayout";
import "../invisible-captcha.css";

export function LoginPageSkeleton() {
  return (
    <LoginLayout loading>
      <div className="login-form-content" aria-hidden="true">
        <div className="login-title">
          <div className="flex h-lh items-center">
            <Skeleton className="h-[0.85em] w-4/5" />
          </div>
        </div>
        <div className="login-fields flex flex-col">
          {[0, 1].map((field) => (
            <div key={field} className="login-field">
              <div className="login-input">
                <Skeleton className="size-full rounded-full" />
              </div>
            </div>
          ))}
          <div className="login-options">
            <div className="login-link flex h-lh items-center gap-3">
              <Skeleton className="size-[1.2em] shrink-0" />
              <Skeleton className="h-[0.8em] w-[7.5em]" />
            </div>
            <div className="login-link flex h-lh items-center">
              <Skeleton className="h-[0.8em] w-[8em]" />
            </div>
          </div>
          <div className="login-actions">
            <div className="login-submit overflow-hidden rounded-full">
              <Skeleton className="size-full rounded-full" />
            </div>
            <div className="recaptcha-notice">
              <Skeleton className="mx-auto mt-1.5 h-3 w-11/12" />
              <Skeleton className="mx-auto mt-1.5 h-3 w-3/5" />
            </div>
            <div className="login-divider">
              <span />
              <div className="flex h-lh items-center">
                <Skeleton className="h-[0.8em] w-[1em]" />
              </div>
              <span />
            </div>
            <div className="login-google overflow-hidden rounded-full">
              <Skeleton className="size-full rounded-full" />
            </div>
          </div>
        </div>
        <div className="login-footer">
          <div className="flex h-[1.5em] w-full items-center justify-center gap-2">
            <Skeleton className="h-[0.8em] w-1/3" />
            <Skeleton className="h-[0.8em] w-1/3" />
          </div>
        </div>
      </div>
    </LoginLayout>
  );
}
