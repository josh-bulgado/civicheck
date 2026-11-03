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
  onReactivate,
}: {
  staffMember: StaffMember;
  isResending: boolean;
  onManage: (staffMember: StaffMember) => void;
  onResend: (staffMember: StaffMember) => void;
  onCancel: (staffMember: StaffMember) => void;
  onRemove: (staffMember: StaffMember) => void;
  onReactivate: (staffMember: StaffMember) => void;
}) {
  if (staffMember.role === "admin") return null;

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="lg"
        shape="pill"
        onClick={() => onManage(staffMember)}
        disabled={staffMember.status !== "active"}
        className="whitespace-nowrap"
      >
        <ShieldCheck aria-hidden="true" data-icon="inline-start" />
        Manage Access
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          nativeButton
          render={
            <Button
              variant="ghost"
              size="icon-lg"
              className="text-muted-foreground data-open:bg-muted"
            />
          }
        >
          <MoreHorizontal aria-hidden="true" />
          <span className="sr-only">
            Actions for {staffMember.firstName} {staffMember.lastName}
          </span>
        </DropdownMenuTrigger>
        {/* The menu defaults to the trigger's width, which is the icon button
            here, so it sizes to its longest item instead. */}
        <DropdownMenuContent
          align="end"
          variant="roomy"
          className="w-max whitespace-nowrap"
        >
          {staffMember.status !== "active" ? (
            <DropdownMenuItem onClick={() => onReactivate(staffMember)}>
              <RotateCcw />
              Reactivate staff member
            </DropdownMenuItem>
          ) : !staffMember.emailConfirmed ? (
            <>
              <DropdownMenuItem
                disabled={isResending}
                onClick={() => onResend(staffMember)}
              >
                <RotateCcw />
                {isResending ? "Resending invitation..." : "Resend invitation"}
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
              Deactivate staff member
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
