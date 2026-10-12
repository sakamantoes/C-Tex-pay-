// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        pulseSoft: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(16, 185, 129, 0.55)" },
          "50%": { boxShadow: "0 0 0 12px rgba(16, 185, 129, 0)" },
        },
        fadeSlideIn: {
          from: { opacity: 0, transform: "translateY(6px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        pulseSoft: "pulseSoft 2.5s ease-in-out infinite",
        fadeSlideIn: "fadeSlideIn 0.25s ease-out",
      },
    },
  },
  plugins: [],
};