/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        nunito: ['Nunito', 'sans-serif'],
        quicksand: ['Quicksand', 'sans-serif'],
        display: ['Nunito', 'sans-serif'],
      },
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        border: 'hsl(var(--border) / <alpha-value>)',
        lumios: {
          blue: 'hsl(var(--lumios-blue) / <alpha-value>)',
          red: 'hsl(var(--lumios-red) / <alpha-value>)',
          green: 'hsl(var(--lumios-green) / <alpha-value>)',
        },
        golden: 'hsl(var(--golden) / <alpha-value>)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        xl: 'calc(var(--radius) * 1.5)',
        '2xl': 'calc(var(--radius) * 2)',
        '3xl': 'calc(var(--radius) * 3)',
      },
      boxShadow: {
        'glow-blue': '0 0 20px hsl(217 85% 55% / 0.3)',
        'glow-red': '0 0 20px hsl(0 75% 58% / 0.3)',
        'glow-green': '0 0 20px hsl(150 55% 48% / 0.3)',
        'glow-golden': '0 0 20px hsl(43 96% 56% / 0.4)',
        'card': '0 2px 12px hsl(220 25% 18% / 0.06)',
        'card-hover': '0 4px 24px hsl(220 25% 18% / 0.1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 10px hsl(217 85% 55% / 0.3)' },
          '50%': { boxShadow: '0 0 25px hsl(217 85% 55% / 0.6), 0 0 40px hsl(217 85% 55% / 0.2)' },
        },
        'pulse-glow-golden': {
          '0%, 100%': { boxShadow: '0 0 10px hsl(43 96% 56% / 0.4)' },
          '50%': { boxShadow: '0 0 25px hsl(43 96% 56% / 0.8), 0 0 40px hsl(43 96% 56% / 0.3)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% center' },
          to: { backgroundPosition: '200% center' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        float: 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'pulse-glow-golden': 'pulse-glow-golden 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
      },
    },
  },
  plugins: [],
}
