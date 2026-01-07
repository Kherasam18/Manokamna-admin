import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#000000',
        accent: '#DFC265',
        secondary: '#FFFFFF',
        highlight: '#E5C07B',
      }
    },
  },
  darkMode: 'media',
  plugins: [],
} satisfies Config
