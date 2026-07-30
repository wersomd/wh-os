"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PiggyBank, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProgressBar, { clampPercent } from "@/components/shared/progress-bar";
import { updateSavingsSettings } from "../actions";
import { formatMoney } from "../money";
import type { FinanceInsights } from "../queries";

const NO_ACCOUNT = "__none__";

export function SavingsInsightCard({
  insights,
  accounts,
}: {
  insights: FinanceInsights;
  accounts: { id: string; name: string; currency: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rate, setRate] = useState(String(insights.savingsRate));
  const [accountId, setAccountId] = useState(insights.savingsAccountId ?? NO_ACCOUNT);

  useEffect(() => {
    if (!dialogOpen) return;
    setRate(String(insights.savingsRate));
    setAccountId(insights.savingsAccountId ?? NO_ACCOUNT);
  }, [dialogOpen, insights]);

  const savingsAccount = accounts.find((a) => a.id === insights.savingsAccountId);
  const currency = savingsAccount?.currency ?? "KZT";
  const pct = Math.round(clampPercent(insights.saved, insights.target));

  function submit() {
    start(async () => {
      const res = await updateSavingsSettings({
        rate,
        accountId: accountId === NO_ACCOUNT ? null : accountId,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Настройки накоплений сохранены");
      setDialogOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-medium">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
            <PiggyBank className="size-3.5" />
          </span>
          Правило Вавилона
        </h2>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Настроить"
        >
          <Settings2 className="size-4" />
        </button>
      </div>

      {!insights.savingsAccountId ? (
        <p className="text-sm text-muted-foreground">
          Выберите счёт для накоплений, чтобы отслеживать прогресс — отложите{" "}
          {insights.savingsRate}% от дохода этого месяца ({formatMoney(insights.target, currency)}
          ).
        </p>
      ) : insights.income === 0 ? (
        <p className="text-sm text-muted-foreground">
          Нет дохода в этом месяце — цель появится после первой транзакции дохода.
        </p>
      ) : (
        <>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">
              Отложено · цель {insights.savingsRate}% от дохода
            </span>
            <span className="tabular-nums">
              {formatMoney(insights.saved, currency)}{" "}
              <span className="text-muted-foreground">
                / {formatMoney(insights.target, currency)}
              </span>
            </span>
          </div>
          <ProgressBar value={insights.saved} max={insights.target} className="mt-2" />
          <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">{pct}%</p>
        </>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-sm">{insights.quote.text}</p>
        {insights.quote.author && (
          <p className="mt-1 text-xs text-muted-foreground">{insights.quote.author}</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Настройка накоплений</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="savings-rate">Процент от дохода</Label>
              <Input
                id="savings-rate"
                type="number"
                min="1"
                max="100"
                step="1"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Счёт для накоплений</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ACCOUNT}>Не выбран</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={pending}>
              Отмена
            </Button>
            <Button onClick={submit} disabled={pending || !rate || Number(rate) <= 0}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
