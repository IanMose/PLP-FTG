import {
  Bell,
  BarChart2,
  type LucideIcon,
  Map,
  ShieldAlert,
  Users,
  ShieldCheck,
  Calculator,
  TriangleAlert,
  ClipboardCheck,
  ListTodo,
  BrainCircuit,
  Wrench,
  ClipboardList,
  UserCog,
  Award,
  MapPin,
  Activity,
  AlertTriangle,
  TrendingDown,
  Timer,
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
  roles?: string[];
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
  roles?: string[];
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
  requiredRoles?: string[];
}

export const sidebarItems: NavGroup[] = [
  // ── 1. Command Center ───────────────────────────────────────────────────────
  {
    id: 1,
    label: "Command Center",
    items: [
      {
        id: "sentinel",
        title: "Overview",
        icon: ShieldAlert,
        subItems: [
          {
            id: "sentinel-overview",
            title: "Dashboard",
            url: "/dashboard/sentinel",
          },
          {
            id: "sentinel-alerts",
            title: "Alerts",
            url: "/dashboard/sentinel/alerts",
            icon: Bell,
          },
          {
            id: "sentinel-analytics",
            title: "Analytics",
            url: "/dashboard/sentinel/analytics",
            icon: BarChart2,
          },
          {
            id: "sentinel-roi",
            title: "ROI Calculator",
            url: "/dashboard/sentinel/roi",
            icon: Calculator,
          },
        ],
      },
      {
        id: "sites",
        title: "Corridor Map",
        url: "/dashboard/sites",
        icon: Map,
      },
    ],
  },

  // ── 2. HSE Operations ───────────────────────────────────────────────────────
  {
    id: 2,
    label: "HSE Operations",
    items: [
      {
        id: "hse-ops",
        title: "HSE Operations",
        icon: ShieldCheck,
        subItems: [
          {
            id: "sentinel-hazards",
            title: "Hazard Reports",
            url: "/dashboard/sentinel/hazards",
            icon: TriangleAlert,
            roles: ["Admin", "HSE Manager", "Auditor", "Analyst", "Station Manager", "Field Technician"],
          },
          {
            id: "sentinel-capas",
            title: "CAPAs",
            url: "/dashboard/sentinel/capas",
            icon: ClipboardCheck,
            roles: ["Admin", "HSE Manager", "Auditor", "Analyst", "Station Manager", "Field Technician"],
          },
        ],
      },
      {
        id: "maintenance",
        title: "Maintenance",
        icon: Wrench,
        subItems: [
          {
            id: "work-orders",
            title: "Work Orders",
            url: "/dashboard/maintenance/work-orders",
            icon: ClipboardList,
            badge: "new",
          },
          {
            id: "maintenance-history",
            title: "History",
            url: "/dashboard/maintenance/history",
            badge: "new",
          },
        ],
      },
      {
        id: "field-ops",
        title: "Field Operations",
        icon: MapPin,
        subItems: [
          {
            id: "sentinel-tasks",
            title: "My Tasks",
            url: "/dashboard/sentinel/my-tasks",
            icon: ListTodo,
            roles: ["Field Technician"],
          },
          {
            id: "nearby-alerts",
            title: "Nearby Alerts",
            url: "/dashboard/field/nearby-alerts",
            icon: AlertTriangle,
            badge: "new",
            roles: ["Field Technician", "Station Manager"],
          },
        ],
      },
    ],
  },

  // ── 3. Workforce ─────────────────────────────────────────────────────────────
  {
    id: 3,
    label: "Workforce",
    requiredRoles: ["Admin", "HSE Manager", "Auditor", "Station Manager"],
    items: [
      {
        id: "technicians",
        title: "Technicians",
        url: "/dashboard/workforce/technicians",
        icon: UserCog,
        badge: "new",
      },
      {
        id: "qualifications",
        title: "Qualifications",
        url: "/dashboard/workforce/qualifications",
        icon: Award,
        badge: "new",
      },
    ],
  },

  // ── 4. ML Administration ─────────────────────────────────────────────────────
  {
    id: 4,
    label: "ML Administration",
    requiredRoles: ["Admin", "ML Admin"],
    items: [
      {
        id: "ml-admin",
        title: "HITL Portal",
        icon: BrainCircuit,
        subItems: [
          {
            id: "ml-overview",
            title: "Overview",
            url: "/dashboard/ml-admin",
          },
          {
            id: "ml-feedback",
            title: "Feedback",
            url: "/dashboard/ml-admin/feedback",
          },
          {
            id: "ml-registry",
            title: "Model Registry",
            url: "/dashboard/ml-admin/registry",
          },
          {
            id: "ml-training-runs",
            title: "Training Runs",
            url: "/dashboard/ml-admin/training-runs",
          },
          {
            id: "ml-drift",
            title: "Drift Monitor",
            url: "/dashboard/ml-admin/drift",
            icon: TrendingDown,
            badge: "new",
          },
          {
            id: "ml-retraining-schedule",
            title: "Auto Retrain",
            url: "/dashboard/ml-admin/retraining-schedule",
            icon: Timer,
            badge: "new",
          },
        ],
      },
    ],
  },

  // ── 5. Accounts ──────────────────────────────────────────────────────────────
  {
    id: 5,
    label: "Accounts",
    items: [
      {
        id: "users",
        title: "Users",
        url: "/dashboard/users",
        icon: Users,
        roles: ["Admin"],
      },
      {
        id: "roles",
        title: "Roles & Permissions",
        url: "/dashboard/roles",
        icon: ShieldCheck,
        roles: ["Admin"],
      },
    ],
  },
];
