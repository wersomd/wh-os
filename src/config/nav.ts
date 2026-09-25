import {
  LayoutDashboard,
  CalendarRange,
  Settings,
  Briefcase,
  Landmark,
  Heart,
  CheckSquare,
  FolderKanban,
  Inbox,
  Target,
  Wallet,
  HandCoins,
  CreditCard,
  StickyNote,
  Bookmark,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export type GroupId = "work" | "money" | "personal";

export type NavGroup = {
  id: GroupId;
  title: string;
  icon: LucideIcon;
  items: NavItem[];
};

export type SearchableNavItem = NavItem & { groupTitle: string };

export const navGroups: NavGroup[] = [
  {
    id: "work",
    title: "Работа",
    icon: Briefcase,
    items: [
      { title: "Задачи", href: "/tasks", icon: CheckSquare },
      { title: "Проекты", href: "/projects", icon: FolderKanban },
      { title: "Заявки", href: "/leads", icon: Inbox },
      { title: "Цели", href: "/goals", icon: Target },
    ],
  },
  {
    id: "money",
    title: "Деньги",
    icon: Landmark,
    items: [
      { title: "Финансы", href: "/finances", icon: Wallet },
      { title: "Долги", href: "/debts", icon: HandCoins },
      { title: "Подписки", href: "/subscriptions", icon: CreditCard },
    ],
  },
  {
    id: "personal",
    title: "Личное",
    icon: Heart,
    items: [
      { title: "Заметки", href: "/notes", icon: StickyNote },
      { title: "Ссылки", href: "/links", icon: Bookmark },
      { title: "Хочу", href: "/wishlist", icon: Sparkles },
    ],
  },
];

// Always-visible icon rail — Home and Calendar sit outside any group since
// they're inherently cross-cutting, not owned by one module.
export const railNav: NavItem[] = [
  { title: "Главная", href: "/dashboard", icon: LayoutDashboard },
  { title: "Календарь", href: "/calendar", icon: CalendarRange },
];

export const footerNav: NavItem[] = [
  { title: "Настройки", href: "/settings", icon: Settings },
];

export function allNavItems(): SearchableNavItem[] {
  return navGroups.flatMap((group) =>
    group.items.map((item) => ({ ...item, groupTitle: group.title })),
  );
}
