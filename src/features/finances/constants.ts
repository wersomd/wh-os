import { AccountType, TransactionType } from "@prisma/client";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CASH: "Наличные",
  CARD: "Карта",
  BANK: "Банк",
  SAVINGS: "Накопления",
  OTHER: "Другое",
};

export const ACCOUNT_TYPE_ORDER: AccountType[] = [
  AccountType.CARD,
  AccountType.CASH,
  AccountType.BANK,
  AccountType.SAVINGS,
  AccountType.OTHER,
];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: "Доход",
  EXPENSE: "Расход",
};

export type FinanceCategoryPreset = {
  name: string;
  type: "EXPENSE" | "INCOME";
  group: string;
  icon: string;
  color: string;
};

export const FINANCE_CATEGORY_PRESETS: FinanceCategoryPreset[] = [
  { name: "Продукты", type: "EXPENSE", group: "Каждый день", icon: "ShoppingBasket", color: "#4f8a62" },
  { name: "Кафе и рестораны", type: "EXPENSE", group: "Каждый день", icon: "Utensils", color: "#bd8444" },
  { name: "Дом и коммунальные услуги", type: "EXPENSE", group: "Каждый день", icon: "House", color: "#72889a" },
  { name: "Связь и интернет", type: "EXPENSE", group: "Каждый день", icon: "Wifi", color: "#6b86aa" },
  { name: "Такси и транспорт", type: "EXPENSE", group: "Передвижение", icon: "Car", color: "#63869a" },
  { name: "Авто и топливо", type: "EXPENSE", group: "Передвижение", icon: "Fuel", color: "#a87852" },
  { name: "Здоровье и аптеки", type: "EXPENSE", group: "Личное", icon: "HeartPulse", color: "#b66b67" },
  { name: "Красота и уход", type: "EXPENSE", group: "Личное", icon: "Sparkles", color: "#a77a91" },
  { name: "Одежда и обувь", type: "EXPENSE", group: "Личное", icon: "Shirt", color: "#8d7baf" },
  { name: "Образование", type: "EXPENSE", group: "Личное", icon: "GraduationCap", color: "#5d8c85" },
  { name: "Маркетплейсы и покупки", type: "EXPENSE", group: "Жизнь", icon: "Package", color: "#a98751" },
  { name: "Подписки и сервисы", type: "EXPENSE", group: "Жизнь", icon: "CirclePlay", color: "#7381ab" },
  { name: "Развлечения", type: "EXPENSE", group: "Жизнь", icon: "Music", color: "#9a7469" },
  { name: "Путешествия", type: "EXPENSE", group: "Жизнь", icon: "Plane", color: "#5f91a0" },
  { name: "Дети и семья", type: "EXPENSE", group: "Семья", icon: "Users", color: "#b57f76" },
  { name: "Подарки и благотворительность", type: "EXPENSE", group: "Семья", icon: "Gift", color: "#b47c92" },
  { name: "Другое", type: "EXPENSE", group: "Другое", icon: "MoreHorizontal", color: "#78827b" },
  { name: "Зарплата", type: "INCOME", group: "Основное", icon: "WalletCards", color: "#4f8a62" },
  { name: "Подработка и фриланс", type: "INCOME", group: "Основное", icon: "BriefcaseBusiness", color: "#5d8c85" },
  { name: "Бизнес", type: "INCOME", group: "Основное", icon: "Store", color: "#63869a" },
  { name: "Возврат средств", type: "INCOME", group: "Другое", icon: "RotateCcw", color: "#72889a" },
  { name: "Подарки", type: "INCOME", group: "Другое", icon: "Gift", color: "#b47c92" },
  { name: "Инвестиции", type: "INCOME", group: "Другое", icon: "ChartNoAxesCombined", color: "#4f8a62" },
  { name: "Другое", type: "INCOME", group: "Другое", icon: "MoreHorizontal", color: "#78827b" },
];
