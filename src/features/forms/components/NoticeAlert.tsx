import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, BadgeCheck, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import type { AnswerNotice } from "../form-template.types";

const ICONS = {
  default: Info,
  warning: AlertTriangle,
  destructive: AlertCircle,
  success: BadgeCheck,
};

/** One look for every message a form template can attach to an answer. */
export function NoticeAlert({
  variant,
  title,
  children,
  className,
}: {
  variant: AnswerNotice["variant"];
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const Icon = ICONS[variant];
  return (
    <Alert variant={variant} className={className}>
      <Icon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
