import type { Config } from 'tailwindcss'
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: 'class', // Включаем поддержку темной темы через класс .dark
  theme: {
    extend: {
      fontFamily: { sans: ["ui-sans-serif","system-ui","-apple-system","Segoe UI","Roboto","Inter","Arial","sans-serif"] },
      // v10.18.0: Info Portal design tokens — replaces hardcoded text-[#...]/bg-[#...].
      // Values are identical to the previous hex literals → zero visual change.
      colors: {
        info: {
          ink: '#333333',
          'ink-dark': '#e0e0e0',
          'ink-muted-dark': '#d0d0d0',
          surface: '#f5f5f0',
          'surface-dark': '#16213e',
          'panel-dark': '#1a1a2e',
          'panel-dark-2': '#1a1a3e',
          'accent-dark': '#0f3460',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
} satisfies Config
