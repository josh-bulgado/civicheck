import type { ElementType } from "react";

export interface NavItem {
  id: string;
  title: string;
  icon: ElementType;
  url: string;
  isActive?: boolean;
  badge?: number;
  /** A dot: something on this page needs a look. Not a count. */
  attention?: boolean;
}

export interface NavGroup {
  id: string;
  label?: string;
  separatorBefore?: boolean;
  items: NavItem[];
}

export interface User {
  name: string;
  email: string;
}

export interface FavoriteItem {
  id: string;
  title: string;
  href: string;
  color: string;
}

export interface TeamItem {
  id: string;
  title: string;
  icon: ElementType;
}

export interface TopicItem {
  id: string;
  title: string;
  icon: ElementType;
}

export interface SidebarData {
  user: User;
  navMain: NavItem[];
  navCollapsible: {
    favorites: FavoriteItem[];
    teams: TeamItem[];
    topics: TopicItem[];
  };
}
