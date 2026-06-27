/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#E8F0FE',
          100: '#C5D8FF',
          200: '#91B3FF',
          500: '#0066CC',
          600: '#0052A3',
          700: '#003B8E',
          800: '#002A6B',
          900: '#001A47',
        },
        sidebar: '#0F172A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
