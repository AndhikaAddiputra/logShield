import { createRequire } from "node:module";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from 'vite-plugin-pwa';

const require = createRequire(import.meta.url);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}']
        },
        manifest: {
          name: 'Log Shield Posko',
          short_name: 'LogShield',
          theme_color: '#1e3a8a',
          background_color: '#ffffff',
          display: 'standalone'
        }
      })
    ],
    resolve: {
      alias: {
        // Vite stubs Node "events" unless we point to the real package (fixes PouchDB EventEmitter).
        events: require.resolve("events"),
        "@log-shield/shared-types": path.resolve(
          __dirname,
          "../../packages/shared-types/src/index.ts"
        ),
        "@log-shield/ui-core": path.resolve(
          __dirname,
          "../../packages/ui-core/src/index.ts"
        ),
        "@log-shield/utils": path.resolve(
          __dirname,
          "../../packages/utils/src/index.ts"
        ),
      },
    },
    server: {
      port: Number(env.VITE_DEV_PORT || 5173),
    },
    optimizeDeps: {
      include: ["pouchdb", "pouchdb-find", "events"],
    },
  };
});
