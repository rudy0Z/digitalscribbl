import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Scribbl brand palette — warm, expressive, nostalgic
        cream: {
          50:  '#FFFDF7',
          100: '#FFF9E6',
          200: '#FFF0C2',
          DEFAULT: '#FFF9E6',
        },
        ink: {
          900: '#1A1208',
          700: '#3D2E14',
          500: '#6B4E1E',
          300: '#A07040',
          DEFAULT: '#1A1208',
        },
        scribble: {
          red:    '#E8453C',
          blue:   '#2563EB',
          green:  '#16A34A',
          purple: '#7C3AED',
          orange: '#EA580C',
          yellow: '#D97706',
        },
        shirt: {
          white:  '#F8F8F8',
          cream:  '#F5F0E0',
          black:  '#1C1C1C',
          navy:   '#1E3A5F',
          sage:   '#6B8E6B',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body:    ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },
      animation: {
        'ghost-pulse': 'ghost-pulse 2s ease-in-out infinite',
        'confetti-in': 'confetti-in 0.6s ease-out',
        'badge-bounce': 'badge-bounce 0.2s ease-out',
        'shirt-flash': 'shirt-flash 0.3s ease-out',
        'box-plant': 'box-plant 0.15s ease-out',
      },
      keyframes: {
        'ghost-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%':       { opacity: '1' },
        },
        'confetti-in': {
          '0%':   { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
        'badge-bounce': {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        'shirt-flash': {
          '0%':   { opacity: '0.7' },
          '100%': { opacity: '1' },
        },
        'box-plant': {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
