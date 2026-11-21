import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#071426',
          900: '#0B1F3A',
          800: '#123A66',
          700: '#1A4D85',
        },
        medblue: {
          400: '#63B3ED',
          500: '#3B8FD9',
          600: '#2F80C9',
          700: '#2366A8',
        },
        admin: {
          bg: '#0A0D12',
          surface: '#11151C',
          border: '#1E2530',
          neonGreen: '#39FF14',
          neonRed: '#FF1744',
          bannerRed: '#9B1126',
          bannerGreen: '#0B7A36',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
