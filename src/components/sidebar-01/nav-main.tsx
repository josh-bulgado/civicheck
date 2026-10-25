"use client";

import { SidebarMenu } from "~/components/ui/sidebar";
import { SidebarNavItem } from "./nav-item";
import type { NavGroup } from "./types";

export function NavMain({ groups, label }: { groups: NavGroup[]; label: string }) {
  return (
    <nav aria-label={label}>
      <SidebarMenu className="civic-stagger gap-2">
        {groups
          .flatMap((group) => group.items)
          .map((item, index) => (
            <SidebarNavItem key={item.id} item={item} index={index} />
          ))}
      </SidebarMenu>
    </nav>
  );
}
