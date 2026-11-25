const v = (n) => `hsl(var(--${n}) / <alpha-value>)`;
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: v("page"), card: v("card"), ink: v("ink"), muted: v("muted"),
        line: v("line"), primary: v("primary"), "primary-fg": v("primary-fg"),
        pill: v("pill"), "pill-fg": v("pill-fg"),
        receive: v("receive"), "receive-bg": v("receive-bg"),
        pay: v("pay"), "pay-bg": v("pay-bg"),
      },
      borderRadius: { card: "1.5rem", chip: "1rem" },
      fontFamily: { sans: ["Figtree", "system-ui", "sans-serif"] },
    },
  },
};
