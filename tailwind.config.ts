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
        // V3 — Zinc-based warm off-blacks (no blue undertone)
        surface: {
          void: '#09090b',
          base: '#131316',
          elevated: '#1c1c21',
          hover: '#252529',
          active: '#2e2e33',
        },
        // Legacy aliases mapped to V3 values
        space: {
          1000: '#09090b',
          975: '#0e0e11',
          950: '#131316',
          900: '#18181c',
          850: '#1c1c21',
          800: '#252529',
          700: '#2e2e33',
          600: '#3f3f46',
          500: '#52525b',
        },
        star: {
          50: '#ededea',
          100: '#d4d4d8',
          200: '#a1a1aa',
          300: '#71717a',
          400: '#52525b',
        },
        nebula: {
          600: '#3f3f46',
          500: '#52525b',
          400: '#71717a',
          300: '#a1a1aa',
          200: '#d4d4d8',
        },
        rocket: {
          500: '#a1a1aa',
          400: '#b5b5bd',
          300: '#d4d4d8',
        },
        plasma: {
          500: '#71717a',
          400: '#a1a1aa',
          300: '#d4d4d8',
        },
      },
      fontFamily: {
        display: ['Satoshi', 'var(--font-body)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'DM Sans', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      fontSize: {
        // V3 display scale — Satoshi
        'display-xl': ['4.5rem', { lineHeight: '1.0', fontWeight: '900', letterSpacing: '-0.03em' }],
        'display-lg': ['3rem', { lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.025em' }],
        'display-md': ['2.25rem', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-sm': ['1.75rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.015em' }],
        // V3 heading scale
        'heading-lg': ['1.375rem', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.01em' }],
        'heading-md': ['1.125rem', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '-0.005em' }],
        // V3 label scale — uppercase
        'label-lg': ['0.8125rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.08em' }],
        'label-md': ['0.6875rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.1em' }],
        'label-sm': ['0.5625rem', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.12em' }],
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
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
          '0%, 100%': { boxShadow: '0 0 15px rgba(255, 255, 255, 0.1)' },
          '50%': { boxShadow: '0 0 25px rgba(255, 255, 255, 0.2)' },
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
        'glow-sm': '0 0 8px rgba(255, 255, 255, 0.06)',
        'glow-md': '0 0 16px rgba(255, 255, 255, 0.08)',
        'glow-lg': '0 0 24px rgba(255, 255, 255, 0.1), 0 0 48px rgba(255, 255, 255, 0.04)',
        'card-hover': '0 8px 32px -8px rgba(0, 0, 0, 0.5)',
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
