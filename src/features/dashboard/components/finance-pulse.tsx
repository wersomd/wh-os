import Link from "next/link";
import { Wallet } from "lucide-react";
import ProgressBar, { clampPercent } from "@/components/shared/progress-bar";
import SparkLine from "@/components/shared/spark-line";
import { formatMoney } from "@/features/finances/money";
import { siteConfig } from "@/config/site";
import type { FinancePulse as Pulse } from "../lib/finance-pulse";

export function FinancePulse({ data }: { data: Pulse }) {
  const pct = Math.round(clampPercent(data.spent, data.budget));
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-medium">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Wallet className="size-3.5" />
          </span>
          Финансовый пульс
        </h2>
        <Link href="/finances" className="text-xs text-primary hover:underline">
          Открыть
        </Link>
      </div>

      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">Траты за месяц</span>
        <span className="tabular-nums">
          {formatMoney(data.spent, siteConfig.defaultCurrency)}{" "}
          <span className="text-muted-foreground">/ {formatMoney(data.budget, siteConfig.defaultCurrency)}</span>
        </span>
      </div>
      <ProgressBar value={data.spent} max={data.budget} className="mt-2" />
      <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">{pct}%</p>

      <div className="mt-4 text-primary">
        <SparkLine values={data.spark} width={240} height={32} className="h-8 w-full" />
      </div>

      <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">Чистые активы</span>
        <span className="font-medium tabular-nums">
          {formatMoney(data.netWorth, siteConfig.defaultCurrency)}
        </span>
      </div>
    </div>
  );
}
