/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B3C5D',
          dark: '#082A42',
          light: '#0E4A6F',
        },
        secondary: {
          DEFAULT: '#F2A900',
          dark: '#D49400',
          light: '#FFB800',
        },
        accent: {
          DEFAULT: '#FFFFFF',
        },
        neutral: {
          DEFAULT: '#F5F7FA',
          dark: '#E8ECF1',
        },
      },
    },
  },
  plugins: [],
}

