/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pastel: {
          cream: '#fdf8e9',
          pink: '#f4a6b8',
          'pink-light': '#fad4dc',
          mint: '#c5e8b7',
          'mint-light': '#e2f4db',
          lavender: '#c4b5d4',
          'lavender-light': '#e5dfed',
          text: '#5a4a6a',
          'text-muted': '#7d6b8a',
        },
      },
    },
  },
  plugins: [],
};
