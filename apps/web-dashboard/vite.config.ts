import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@log-shield/shared-types": path.resolve(
        __dirname,
        "../../packages/shared-types/src/index.ts"
      ),
      "@log-shield/ui-core": path.resolve(
        __dirname,
        "../../packages/ui-core/src/index.ts"
      ),
    },
  },
  server: { port: 5174 },
});
