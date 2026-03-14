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
        // V2 neutral palette — true black foundation
        space: {
          1000: '#000000',
          975: '#050505',
          950: '#0a0a0a',
          900: '#0f0f0f',
          850: '#141414',
          800: '#1a1a1a',
          700: '#262626',
          600: '#333333',
          500: '#525252',
        },
        star: {
          50: '#fafafa',
          100: '#e5e5e5',
          200: '#d4d4d4',
          300: '#a1a1a1',
          400: '#666666',
        },
        // Legacy tokens — mapped to V2 neutrals for backward compat (migrate in Phase 4)
        nebula: {
          600: '#333333',
          500: '#404040',
          400: '#525252',
          300: '#a1a1a1',
          200: '#d4d4d4',
        },
        rocket: {
          500: '#a1a1a1',
          400: '#b5b5b5',
          300: '#d4d4d4',
        },
        plasma: {
          500: '#737373',
          400: '#a1a1a1',
          300: '#d4d4d4',
        },
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['4.5rem', { lineHeight: '1.05', fontWeight: '600', letterSpacing: '-0.035em' }],
        'display-lg': ['3.5rem', { lineHeight: '1.08', fontWeight: '600', letterSpacing: '-0.03em' }],
        'display-md': ['2.5rem', { lineHeight: '1.15', fontWeight: '500', letterSpacing: '-0.03em' }],
        'display-sm': ['1.875rem', { lineHeight: '1.25', fontWeight: '500', letterSpacing: '-0.025em' }],
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
