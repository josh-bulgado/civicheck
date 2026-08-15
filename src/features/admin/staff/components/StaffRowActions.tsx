import {
  MoreHorizontal,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserMinus,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { StaffMember } from "../staff.types";

export function StaffRowActions({
  staffMember,
  isResending,
  onManage,
  onResend,
  onCancel,
  onRemove,
}: {
  staffMember: StaffMember;
  isResending: boolean;
  onManage: (staffMember: StaffMember) => void;
  onResend: (staffMember: StaffMember) => void;
  onCancel: (staffMember: StaffMember) => void;
  onRemove: (staffMember: StaffMember) => void;
}) {
  if (staffMember.role === "admin") return null;

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onManage(staffMember)}
        className="whitespace-nowrap"
      >
        <ShieldCheck />
        Manage access
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground data-open:bg-muted"
            />
          }
        >
          <MoreHorizontal />
          <span className="sr-only">
            Actions for {staffMember.firstName} {staffMember.lastName}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {!staffMember.emailConfirmed ? (
            <>
              <DropdownMenuItem
                disabled={isResending}
                onClick={() => onResend(staffMember)}
              >
                <RotateCcw />
                {isResending
                  ? "Resending invitation..."
                  : "Resend invitation"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onCancel(staffMember)}
              >
                <Trash2 />
                Cancel invitation
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onRemove(staffMember)}
            >
              <UserMinus />
              Remove staff member
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
