import type { SearchableNavItem } from "@/config/nav";

export function filterNavItems(
  items: SearchableNavItem[],
  query: string,
): SearchableNavItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.groupTitle.toLowerCase().includes(q),
  );
}
