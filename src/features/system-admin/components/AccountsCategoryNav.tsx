import { Link } from "@tanstack/react-router";
import { Building2, ShieldCheck, UsersRound } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { accountCategoryLabels } from "../system-admin.constants";
import type { AccountCategory } from "../system-admin.types";

const categoryIcons = {
  personnel: Building2,
  citizens: UsersRound,
  "platform-admins": ShieldCheck,
} satisfies Record<AccountCategory, typeof Building2>;

const categories = [
  "personnel",
  "citizens",
  "platform-admins",
] as const satisfies readonly AccountCategory[];

export function AccountsCategoryNav({
  activeCategory,
}: {
  activeCategory: AccountCategory;
}) {
  return (
    <Tabs value={activeCategory} className="w-full items-center">
      <TabsList className="h-auto! w-full justify-start gap-1 overflow-auto rounded-xl border border-border bg-white p-2">
        {categories.map((category) => {
          const Icon = categoryIcons[category];

          return (
            <TabsTrigger
              key={category}
              value={category}
              render={
                <Link
                  to="/system-admin/accounts"
                  search={{ category, page: 1 }}
                />
              }
              className="h-10 flex-none px-3.5 font-semibold data-active:bg-primary data-active:text-primary-foreground"
            >
              <Icon className="size-4" />
              {accountCategoryLabels[category]}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
