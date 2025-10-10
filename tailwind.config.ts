import type { Config } from 'tailwindcss'
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: 'class', // Включаем поддержку темной темы через класс .dark
  theme: {
    extend: {
      fontFamily: { sans: ["ui-sans-serif","system-ui","-apple-system","Segoe UI","Roboto","Inter","Arial","sans-serif"] }
    },
  },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config
