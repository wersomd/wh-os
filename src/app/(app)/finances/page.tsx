import type { Metadata } from "next";
import { FinancesView } from "@/features/finances/components/finances-view";
import {
  getAccountsWithBalance,
  getBudgetsWithSpend,
  getCategoriesWithCount,
  getFinanceInsights,
  getTransactions,
} from "@/features/finances/queries";

export const metadata: Metadata = { title: "Финансы" };

export default async function FinancesPage() {
  const [accounts, transactions, categories, budgets, insights] = await Promise.all([
    getAccountsWithBalance(),
    getTransactions(),
    getCategoriesWithCount(),
    getBudgetsWithSpend(),
    getFinanceInsights(),
  ]);

  return (
    <FinancesView
      accounts={accounts}
      transactions={transactions}
      categories={categories}
      budgets={budgets}
      insights={insights}
    />
  );
}
