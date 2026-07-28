import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
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
