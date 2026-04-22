/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        ls: {
          navy: "#1a2b5d",
          "navy-deep": "#0f1a3d",
          accent: "#2563eb",
          "accent-soft": "#dbeafe",
          sidebar: "#f1f5f9",
          "sidebar-border": "#e2e8f0",
          "sidebar-active": "#e0f2fe",
          "sidebar-active-border": "#2563eb",
          surface: "#f8fafc",
          border: "#e2e8f0",
          muted: "#64748b",
          foreground: "#0f172a",
          card: "#ffffff",
          success: "#16a34a",
          "success-soft": "#dcfce7",
          warning: "#ca8a04",
          "warning-soft": "#fef9c3",
          danger: "#dc2626",
          "danger-soft": "#fee2e2",
          info: "#2563eb",
          "info-soft": "#dbeafe",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
        ],
      },
      borderRadius: {
        ls: "10px",
        "ls-sm": "8px",
        "ls-lg": "12px",
      },
      boxShadow: {
        ls: "0 1px 3px 0 rgb(15 23 42 / 0.06), 0 1px 2px -1px rgb(15 23 42 / 0.06)",
        "ls-md":
          "0 4px 6px -1px rgb(15 23 42 / 0.07), 0 2px 4px -2px rgb(15 23 42 / 0.05)",
      },
    },
  },
};
