/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tesla: {
          red: '#E31937',
          dark: '#171717',
          darker: '#0d0d0d',
          panel: '#1e1e1e',
          border: '#2a2a2a',
          text: '#e5e5e5',
          muted: '#737373',
          accent: '#3b82f6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
