import {
  Bell,
  type LucideIcon,
  Map,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Users,
} from "lucide-react";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Dashboards",
    items: [
      {
        id: "sentinel",
        title: "Sentinel",
        url: "/dashboard/sentinel",
        icon: ShieldAlert,
      },
      {
        id: "compliance",
        title: "Compliance",
        url: "/dashboard/compliance",
        icon: ShieldCheck,
      },
      {
        id: "compliance",
        title: "Compliance",
        url: "/dashboard/compliance",
        icon: ShieldCheck,
      },
      {
        id: "alerts",
        title: "Alerts",
        url: "/dashboard/alerts",
        icon: Bell,
      },
      {
        id: "sites",
        title: "Sites",
        url: "/dashboard/sites",
        icon: Map,
      },
    ],
  },
  {
    id: 2,
    label: "Accounts",
    items: [
      {
        id: "users",
        title: "Users",
        url: "/dashboard/users",
        icon: Users,
      },
      {
        id: "roles",
        title: "Roles & Permissions",
        url: "/dashboard/roles",
        icon: ShieldCheck,
      },
    ],
  },
];
