import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Primary — Deep Medical Blue
        navy: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a5b4fc',
          600: '#1E40AF',
          700: '#1e3a8a',
          800: '#1e2d6b',
          900: '#0F172A',
          950: '#0a0f1e',
        },
        // Success / In-stock — Fresh Green
        emerald: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
        },
        // Warning / SLA urgency
        amber: {
          50:  '#fffbeb',
          100: '#fef3c7',
          400: '#fbbf24',
          500: '#F59E0B',
          600: '#d97706',
          700: '#b45309',
        },
        // Danger / SLA breach / cancel
        crimson: {
          50:  '#fff1f2',
          100: '#ffe4e6',
          400: '#fb7185',
          500: '#EF4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        // Neutral surface scale
        surface: {
          0:   '#ffffff',
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        'card':         '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-md':      '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'card-lg':      '0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
        'glow-emerald': '0 0 0 3px rgb(16 185 129 / 0.2)',
        'glow-navy':    '0 0 0 3px rgb(30 64 175 / 0.2)',
        'glow-crimson': '0 0 0 3px rgb(239 68 68 / 0.2)',
      },
      borderRadius: {
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up':   'slideUp 0.2s ease-out',
        'fade-in':    'fadeIn 0.15s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
