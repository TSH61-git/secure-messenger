/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        surface: {
          900: '#0f1117',
          800: '#161b27',
          700: '#1e2535',
          600: '#252d40',
          500: '#2e3957',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#4f52d9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
