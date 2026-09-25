"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { railNav, footerNav, type NavItem } from "@/config/nav";
import BrandMark from "@/components/shared/brand-mark";
import { CommandPalette } from "./command-palette";

function RailLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={item.title}
      className={cn(
        "flex size-10 items-center justify-center rounded-xl transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="size-5" />
      <span className="sr-only">{item.title}</span>
    </Link>
  );
}

export function IconRail() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 flex w-14 flex-col items-center gap-2 border-r border-border bg-background py-4">
        <Link href="/dashboard" className="mb-4" title="WH·OS">
          <BrandMark />
        </Link>

        <nav className="flex flex-col gap-1">
          {railNav.map((item) => (
            <RailLink key={item.href} item={item} />
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          title="Поиск / перейти в раздел"
          className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Search className="size-5" />
          <span className="sr-only">Поиск / перейти в раздел</span>
        </button>

        <nav className="mt-auto flex flex-col gap-1">
          {footerNav.map((item) => (
            <RailLink key={item.href} item={item} />
          ))}
        </nav>
      </aside>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
