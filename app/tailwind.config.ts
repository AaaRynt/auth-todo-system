import { type Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './app/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
    },
  },
  plugins: [],
}

export default config
