/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        oswald: ['Oswald', 'sans-serif'],
        inter: ['Inter', 'sans-serif']
      },
      colors: {
        elite: {
          bg: '#ffffff',
          dark: '#1a1a1a',
          card: '#111111',
          red: '#f21d2f',
          gold: '#eab308',
          gray: '#333333',
          textMuted: '#888888',
          textLight: '#dddddd'
        }
      }
    }
  },
  plugins: [],
};