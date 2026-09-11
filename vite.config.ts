import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  test: {
    environment: "node",
    // Explícito y no por exclusión: la carpeta .claude/worktrees contiene
    // worktrees de otros proyectos con sus propios tests, que no son nuestros.
    include: ["src/**/*.test.ts", "supabase/functions/**/*.test.ts"],
  },
});
