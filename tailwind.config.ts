import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        space: {
          1000: '#030712',
          975: '#050a15',
          950: '#070b14',
          900: '#0a0f1a',
          850: '#0d1320',
          800: '#111827',
          700: '#1e293b',
          600: '#334155',
          500: '#475569',
        },
        nebula: {
          600: '#3b0e7a',
          500: '#4c1d95',
          400: '#6d28d9',
          300: '#8b5cf6',
          200: '#a78bfa',
        },
        star: {
          50: '#f8fafc',
          100: '#e2e8f0',
          200: '#cbd5e1',
          300: '#94a3b8',
          400: '#64748b',
        },
        rocket: {
          500: '#f97316',
          400: '#fb923c',
          300: '#fdba74',
        },
        plasma: {
          500: '#0891b2',
          400: '#06b6d4',
          300: '#22d3ee',
        },
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        brand: ['var(--font-orbitron)', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['4.5rem', { lineHeight: '1.05', fontWeight: '700', letterSpacing: '-0.035em' }],
        'display-lg': ['3.5rem', { lineHeight: '1.08', fontWeight: '700', letterSpacing: '-0.03em' }],
        'display-md': ['2.5rem', { lineHeight: '1.15', fontWeight: '600', letterSpacing: '-0.025em' }],
        'display-sm': ['1.875rem', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.02em' }],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'twinkle': 'twinkle 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in-down': 'fadeInDown 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out forwards',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'fade-out': 'fadeOut 0.3s ease-in forwards',
        'progress-shimmer': 'progressShimmer 1.5s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 6s ease infinite',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '0.2' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(139, 92, 246, 0.3)' },
          '50%': { boxShadow: '0 0 25px rgba(139, 92, 246, 0.5)' },
        },
        fadeOut: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(10px)' },
        },
        progressShimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow-sm': '0 0 8px rgba(139, 92, 246, 0.1)',
        'glow-md': '0 0 16px rgba(139, 92, 246, 0.15)',
        'glow-lg': '0 0 24px rgba(139, 92, 246, 0.2), 0 0 48px rgba(139, 92, 246, 0.06)',
        'glow-plasma': '0 0 16px rgba(6, 182, 212, 0.15), 0 0 32px rgba(6, 182, 212, 0.06)',
        'card-hover': '0 8px 32px -8px rgba(0, 0, 0, 0.4)',
      },
      spacing: {
        'fluid-xs': 'var(--space-xs)',
        'fluid-sm': 'var(--space-sm)',
        'fluid-md': 'var(--space-md)',
        'fluid-lg': 'var(--space-lg)',
        'fluid-xl': 'var(--space-xl)',
        'fluid-2xl': 'var(--space-2xl)',
        'fluid-section': 'var(--space-section)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
export default config
