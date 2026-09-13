/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          main: '#0B0F19',
        },
        surface: {
          card: '#111827',
          border: '#1F2937',
        },
        text: {
          primary: '#F9FAFB',
          muted: '#9CA3AF',
        },
        department: {
          eng: '#3B82F6',
          trd: '#F59E0B',
          snt: '#10B981',
        },
        status: {
          optimal: '#10B981',
          warning: '#F59E0B',
          critical: '#EF4444',
          shadow: '#8B5CF6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [],
}
