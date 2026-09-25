import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GroupId } from "@/config/nav";

const GROUP_STYLES: Record<GroupId, { bg: string; text: string }> = {
  work: { bg: "bg-group-work-soft", text: "text-group-work" },
  money: { bg: "bg-group-money-soft", text: "text-group-money" },
  personal: { bg: "bg-group-personal-soft", text: "text-group-personal" },
};

export function GroupTile({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: GroupId;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  const styles = GROUP_STYLES[id];
  return (
    <div
      className={cn(
        "rounded-2xl border border-border p-5 shadow-md transition-shadow hover:shadow-lg",
        styles.bg,
      )}
    >
      <Link href={`/groups/${id}`} className="group mb-3 flex items-center gap-2">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-xl bg-background/60",
            styles.text,
          )}
        >
          <Icon className="size-4" />
        </span>
        <h2 className="font-display text-lg font-bold group-hover:underline">
          {title}
        </h2>
      </Link>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function TileRow({
  href,
  label,
  value,
  alert = false,
}: {
  href: string;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-background/60"
    >
      <span className="truncate text-muted-foreground">{label}</span>
      <span
        className={cn(
          "shrink-0 font-semibold tabular-nums",
          alert && "text-destructive",
        )}
      >
        {value}
      </span>
    </Link>
  );
}
