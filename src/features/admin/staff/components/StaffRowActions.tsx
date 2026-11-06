import { ChevronDown, Trash2, UserMinus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { StaffMember } from "../staff.types";

export interface StaffRowActionHandlers {
  onManage: (staffMember: StaffMember) => void;
  onResend: (staffMember: StaffMember) => void;
  onCancel: (staffMember: StaffMember) => void;
  onRemove: (staffMember: StaffMember) => void;
  onReactivate: (staffMember: StaffMember) => void;
}

export function StaffRowActions({
  staffMember,
  isResending,
  onManage,
  onResend,
  onCancel,
  onRemove,
  onReactivate,
}: {
  staffMember: StaffMember;
  isResending: boolean;
} & StaffRowActionHandlers) {
  if (staffMember.role === "admin") return null;

  const isActive = staffMember.status === "active";
  const isInvited = isActive && !staffMember.emailConfirmed;
  const staffName = `${staffMember.firstName} ${staffMember.lastName}`.trim();

  if (!isActive) {
    return (
      <Button
        variant="outline"
        onClick={() => onReactivate(staffMember)}
        className="w-40"
      >
        Reactivate
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <ButtonGroup
        aria-label={`Actions for ${staffName}`}
        variant="outline"
        className="w-40"
      >
        <Button
          onClick={() =>
            isInvited ? onResend(staffMember) : onManage(staffMember)
          }
          disabled={isInvited && isResending}
          className="min-w-0 flex-1"
        >
          {isInvited
            ? isResending
              ? "Resending..."
              : "Resend invitation"
            : "Manage access"}
        </Button>
        <DropdownMenuTrigger
          nativeButton
          render={<Button className="text-muted-foreground" />}
        >
          <ChevronDown aria-hidden="true" />
          <span className="sr-only">More actions for {staffName}</span>
        </DropdownMenuTrigger>
      </ButtonGroup>
      <DropdownMenuContent
        align="end"
        variant="roomy"
        className="w-max whitespace-nowrap"
      >
        <DropdownMenuGroup>
          {isInvited ? (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onCancel(staffMember)}
            >
              <Trash2 />
              Cancel invitation
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onRemove(staffMember)}
            >
              <UserMinus />
              Deactivate staff member
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
