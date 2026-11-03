import type {
  FormTemplateDefinition,
  TemplateAnswers,
} from "../form-template.types";
import { getDerivedAnswerFeedback } from "../form-template.utils";
import { NoticeAlert } from "./NoticeAlert";

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
      {feedback.map((item) => (
        <NoticeAlert
          key={item.key}
          variant={item.notice.variant}
          title={item.notice.title}
        >
          {item.label}: {item.age}. {item.notice.description}
        </NoticeAlert>
      ))}
    </div>
  );
}
