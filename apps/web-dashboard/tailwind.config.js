import logShieldPreset from "../../packages/ui-core/tailwind.preset.mjs";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [logShieldPreset],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui-core/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
};
