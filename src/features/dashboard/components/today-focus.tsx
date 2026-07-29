import Link from "next/link";
import { CheckSquare, Repeat, Sun } from "lucide-react";
import type { FocusItem } from "../lib/today-focus";

export function TodayFocus({ items }: { items: FocusItem[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Sun className="size-4 text-primary" /> Сегодня
      </h2>
      {items.length === 0 ? (
        <p className="mt-4 text-lg font-medium">На сегодня всё чисто ✦</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((it) => (
            <li key={`${it.kind}-${it.id}`}>
              <Link
                href={it.href}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-base transition-colors hover:bg-muted"
              >
                {it.kind === "task" ? (
                  <CheckSquare className="size-4 text-primary" />
                ) : (
                  <Repeat className="size-4 text-primary" />
                )}
                <span className="truncate">{it.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
