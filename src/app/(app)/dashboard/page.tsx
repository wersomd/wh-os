import type { Metadata } from "next";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Briefcase, Landmark, Heart } from "lucide-react";
import { AnimatedIn } from "@/components/shared/animated-in";
import { GroupTile, TileRow } from "@/features/dashboard/components/group-tile";
import { getHotProjects } from "@/features/projects/queries";
import { formatMoney } from "@/features/finances/money";
import { getDashboardSummary, getPersonalSummary } from "@/features/dashboard/queries";

export const metadata: Metadata = { title: "Главная" };

function greeting(hour: number): string {
  if (hour < 6) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

function pluralizeTask(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "задача";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "задачи";
  return "задач";
}

export default async function DashboardPage() {
  const [s, hotProjects, personal] = await Promise.all([
    getDashboardSummary(),
    getHotProjects(1),
    getPersonalSummary(),
  ]);
  const now = new Date();
  const currencies = Object.entries(s.balances);
  const debtCurrencies = Object.entries(s.debts.totals);
  const topProject = hotProjects[0];
  const nextSub = s.subscriptions[0];
  const firingToday = s.tasks.dueCount;

  return (
    <>
      <div className="mb-8">
        <h1 className="font-display text-4xl font-bold tracking-tight">
          {greeting(now.getHours())}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground first-letter:uppercase">
          {format(now, "EEEE, d MMMM", { locale: ru })}
          {firingToday > 0 &&
            ` · ${firingToday} ${pluralizeTask(firingToday)} горит сегодня`}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <AnimatedIn delay={0} className="h-full">
          <GroupTile id="work" title="Работа" icon={Briefcase}>
            <TileRow
              href="/tasks"
              label="Открытых задач"
              value={String(s.tasks.openCount)}
            />
            <TileRow
              href="/tasks"
              label="Горит сегодня"
              value={String(firingToday)}
              alert={firingToday > 0}
            />
            {topProject && (
              <TileRow
                href={`/projects/${topProject.id}`}
                label={topProject.name}
                value={
                  topProject.progress.percent === null
                    ? "Нет задач"
                    : `${topProject.progress.percent}%`
                }
              />
            )}
          </GroupTile>
        </AnimatedIn>

        <AnimatedIn delay={0.05} className="h-full">
          <GroupTile id="money" title="Деньги" icon={Landmark}>
            {currencies.length === 0 ? (
              <TileRow href="/finances" label="Баланс" value="—" />
            ) : (
              currencies.map(([currency, value]) => (
                <TileRow
                  key={currency}
                  href="/finances"
                  label={`Баланс, ${currency}`}
                  value={formatMoney(value, currency)}
                />
              ))
            )}
            {nextSub && (
              <TileRow
                href="/subscriptions"
                label={nextSub.name}
                value={formatMoney(nextSub.amount, nextSub.currency)}
              />
            )}
            {debtCurrencies.length > 0 && (
              <TileRow
                href="/debts"
                label="Просрочено долгов"
                value={String(s.debts.overdue)}
                alert={s.debts.overdue > 0}
              />
            )}
          </GroupTile>
        </AnimatedIn>

        <AnimatedIn delay={0.1} className="h-full">
          <GroupTile id="personal" title="Личное" icon={Heart}>
            <TileRow
              href="/notes"
              label="Закреплённых заметок"
              value={String(personal.pinnedNotesCount)}
            />
            {personal.wishlistHighlights[0] && (
              <TileRow
                href="/wishlist"
                label={personal.wishlistHighlights[0].title}
                value="хочу"
              />
            )}
            <TileRow
              href="/links"
              label="Сохранённых ссылок"
              value={String(personal.bookmarkCount)}
            />
          </GroupTile>
        </AnimatedIn>
      </div>
    </>
  );
}
