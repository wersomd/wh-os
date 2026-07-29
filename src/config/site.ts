export const siteConfig = {
  name: "JinseiOS",
  description: "Личная операционная система жизни",
  defaultCurrency: "KZT",
  supportedCurrencies: ["KZT", "USD"] as const,
} as const;

export type Currency = (typeof siteConfig.supportedCurrencies)[number];
