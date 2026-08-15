import { Search } from "lucide-react";
import { Input } from "~/components/ui/input";

export function StaffTableToolbar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative w-full sm:max-w-sm">
      <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <Input
        placeholder="Filter staff members"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg pl-10 text-sm"
      />
    </div>
  );
}
