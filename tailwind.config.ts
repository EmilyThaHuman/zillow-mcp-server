import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        expedia: {
          blue: '#0066cc',
          darkblue: '#003b95',
        }
      }
    },
  },
  plugins: [],
} satisfies Config;

