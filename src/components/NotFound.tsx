import type { ReactNode } from "react";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  Search,
  SearchX,
} from "lucide-react";
import {
  ErrorPageLayout,
  errorActionClass,
  errorLinkClass,
  useErrorPageUser,
} from "~/components/errors/ErrorPageLayout";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const NEXT_STEPS = [
  {
    to: "/requirements",
    icon: ClipboardCheck,
    title: "Check my requirements",
    description: "See what to bring before you visit the CCRO.",
  },
  {
    to: "/track",
    icon: Search,
    title: "Track a request",
    description: "Look up a request with its tracking number.",
  },
] as const;

export function NotFound({ children }: { children?: ReactNode }) {
  const router = useRouter();
  const user = useErrorPageUser();
  const pathname = useLocation({ select: (location) => location.pathname });

  return (
    <ErrorPageLayout
      tone="info"
      code="404"
      icon={SearchX}
      eyebrow="Page not found"
      title="We can't find that page"
      description={
        children ??
        "The address may be mistyped, or the page may have moved. Your account and any requests you've made are not affected."
      }
      detail={{ label: "Requested address", value: pathname }}
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            className={errorActionClass}
            onClick={() => router.history.back()}
          >
            <ArrowLeft data-icon="inline-start" />
            Go back
          </Button>
          <Link to={user ? "/dashboard" : "/"} className={errorLinkClass()}>
            {user ? "Go to my dashboard" : "Back to home"}
            <ArrowRight data-icon="inline-end" />
          </Link>
        </>
      }
      aside={
        <ul className="grid gap-3 sm:grid-cols-2">
          {NEXT_STEPS.map(({ to, icon: Icon, title, description }) => (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "group flex h-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-xs",
                  "transition-[border-color,box-shadow,transform] duration-(--duration-base) ease-(--ease-civic)",
                  "hover:border-primary/40 hover:shadow-sm",
                )}
              >
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"
                >
                  <Icon className="size-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
                    {description}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      }
    />
  );
}
