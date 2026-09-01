export const siteConfig = {
  name: "WH·OS",
  description: "Операционная система для работы и жизни — от WH Solutions",
  defaultCurrency: "KZT",
  supportedCurrencies: ["KZT", "USD"] as const,
} as const;

export type Currency = (typeof siteConfig.supportedCurrencies)[number];
