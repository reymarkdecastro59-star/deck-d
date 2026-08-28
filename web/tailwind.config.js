/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0A0918',
        surface: '#1C1B34',
        'surface-2': '#20203A',
        border: '#1E1E4A',
        'text-primary': '#FFFFFF',
        'text-secondary': '#9A9AB8',
        'text-muted': '#5F5F80',
        accent: {
          blue: '#4C7DFF',
          cyan: '#22d3ee',
          purple: '#7c3aed',
          violet: '#a78bfa',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Intel One Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
