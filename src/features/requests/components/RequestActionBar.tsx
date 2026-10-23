import { Lock, MoreHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type {
  PlannedAction,
  RequestActionPlan,
} from "~/features/requests/request-actions";

/**
 * The request's actions in the header: one main button, and the rest in a
 * menu. An action that can't run yet stays visible and disabled, and the reason
 * is shown on the next-step strip and beside it in the menu.
 */
export function RequestActionBar({
  plan,
  busy,
  onAction,
}: {
  plan: RequestActionPlan;
  busy: boolean;
  onAction: (action: PlannedAction) => void;
}) {
  const { primary, secondary, reject } = plan;
  const hasMenu = secondary.length > 0 || reject != null;
  if (!primary && !hasMenu) return null;

  return (
    <div className="flex items-center gap-2">
      {primary && (
        <Button
          disabled={busy || primary.blocked != null}
          onClick={() => onAction(primary)}
        >
          {primary.blocked && <Lock data-icon="inline-start" aria-hidden="true" />}
          {primary.label}
        </Button>
      )}
      {hasMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger
            nativeButton
            render={
              <Button
                variant="outline"
                size="icon"
                disabled={busy}
                aria-label="More actions"
              />
            }
          >
            <MoreHorizontal aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            {secondary.map((action) => (
              <DropdownMenuItem
                key={action.to}
                disabled={action.blocked != null}
                onClick={() => onAction(action)}
                className="flex-col items-start gap-0"
              >
                {action.label}
                {action.blocked && (
                  <span className="text-xs text-muted-foreground">
                    {action.blocked}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
            {secondary.length > 0 && reject && <DropdownMenuSeparator />}
            {reject && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onAction(reject)}
              >
                {reject.label}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
