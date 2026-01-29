import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        blood: {
          50: '#fee2e2',
          100: '#fecaca',
          200: '#fca5a5',
          300: '#f87171',
          400: '#ef4444',
          500: '#dc2626',
          600: '#b91c1c',
          700: '#991b1b',
          800: '#7f1d1d',
          900: '#450a0a',
        },
        gunmetal: {
          50: '#f8fafc',
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
        arena: {
          dark: '#0a0a0f',
          darker: '#050508',
          accent: '#ff0055',
          gold: '#ffd700',
        }
      },
      fontFamily: {
        display: ['var(--font-monument)', 'Impact', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-in',
        'count-up': 'countUp 0.8s ease-out',
      },
      keyframes: {
        glow: {
          'from': { boxShadow: '0 0 20px rgba(255, 0, 85, 0.5)' },
          'to': { boxShadow: '0 0 40px rgba(255, 0, 85, 0.8)' },
        },
        slideUp: {
          'from': { transform: 'translateY(20px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        countUp: {
          'from': { transform: 'scale(1.2)', opacity: '0.5' },
          'to': { transform: 'scale(1)', opacity: '1' },
        },
      },
      backgroundImage: {
        'radial-red': 'radial-gradient(circle at center, rgba(220, 38, 38, 0.15) 0%, transparent 70%)',
        'noise': 'url("/noise.png")',
      },
    },
  },
  plugins: [],
};

export default config;
