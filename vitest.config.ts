import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
  // JSX для .tsx-тестов. Vite 8 использует Oxc как трансформер (ключ `oxc`).
  // Автоматический рантайм — как в самом приложении (Next/React 19), поэтому
  // компонентам не нужен `import React`. Тесты рендерят через
  // renderToStaticMarkup, DOM не требуется.
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },
  resolve: {
    // Разрешаем алиас "@/..." как в проекте (нужно тестам, тянущим @/lib/db).
    // "server-only" в node-окружении Vitest бросает — подменяем пустым модулем.
    alias: {
      "@": path.resolve(process.cwd(), "src"),
      "server-only": path.resolve(process.cwd(), "src/test/empty-module.ts"),
    },
  },
});
