import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  Info,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
import type {
  FormTemplateDefinition,
  TemplateAnswers,
} from "../form-template.types";
import { getDerivedAnswerFeedback } from "../form-template.utils";

const ICONS = {
  default: Info,
  warning: AlertTriangle,
  destructive: AlertCircle,
  success: BadgeCheck,
};

export function DerivedAnswerAlerts({
  definition,
  answers,
}: {
  definition: FormTemplateDefinition;
  answers: TemplateAnswers | Record<string, string>;
}) {
  const feedback = getDerivedAnswerFeedback(definition, answers);
  if (feedback.length === 0) return null;

  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      {feedback.map((item) => {
        const Icon = ICONS[item.notice.variant];
        return (
          <Alert key={item.key} variant={item.notice.variant}>
            <Icon aria-hidden="true" />
            <AlertTitle>{item.notice.title}</AlertTitle>
            <AlertDescription>
              {item.label}: {item.age}. {item.notice.description}
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
