/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        background: '#07071a',
        surface: '#0d0d2b',
        'surface-2': '#13133a',
        border: '#1e1e4a',
        'text-primary': '#f1f5f9',
        'text-secondary': '#94a3b8',
        accent: {
          cyan: '#22d3ee',
          purple: '#7c3aed',
          violet: '#a78bfa',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #7c3aed, #22d3ee)',
      },
    },
  },
  plugins: [],
}
