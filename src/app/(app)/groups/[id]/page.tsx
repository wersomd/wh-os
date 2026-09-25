import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { GROUP_STYLES } from "@/features/dashboard/components/group-tile";
import { findGroupById } from "../group-lookup";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const group = findGroupById(id);
  return { title: group ? group.title : "Раздел" };
}

export default async function GroupLandingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const group = findGroupById(id);
  if (!group) notFound();

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">
        {group.title}
      </h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {group.items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 shadow-md transition-transform hover:-translate-y-0.5"
            >
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl",
                  GROUP_STYLES[group.id].bg,
                  GROUP_STYLES[group.id].text,
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="font-medium">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
