import { ThemeToggle } from "./theme-toggle";
import { AccountMenu } from "./account-menu";

export function TopStrip({
  user,
}: {
  user: { email?: string | null; name?: string | null };
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-2 border-b border-border bg-background/95 px-4 backdrop-blur md:px-8">
      <ThemeToggle />
      <AccountMenu user={user} />
    </header>
  );
}
