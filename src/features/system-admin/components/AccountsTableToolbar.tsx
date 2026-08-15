import { Search, UserRoundCog } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export function AccountsTableToolbar({
  value,
  onChange,
  placeholder,
  onReplaceAdministrator,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onReplaceAdministrator?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 rounded-lg pl-10 text-sm"
        />
      </div>
      {onReplaceAdministrator ? (
        <Button onClick={onReplaceAdministrator} className="sm:shrink-0">
          <UserRoundCog />
          Replace CCRO Administrator
        </Button>
      ) : null}
    </div>
  );
}
