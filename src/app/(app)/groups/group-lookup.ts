import { navGroups, type NavGroup } from "@/config/nav";

export function findGroupById(id: string): NavGroup | undefined {
  return navGroups.find((group) => group.id === id);
}
