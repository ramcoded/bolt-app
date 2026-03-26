/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bolt: {
          bg: '#05071a',
          navy: '#0a0f2e',
          glass: 'rgba(255,255,255,0.05)',
          border: 'rgba(255,255,255,0.10)',
          maroon: '#8B1A1A',
          'maroon-light': '#c0392b',
          'maroon-glow': 'rgba(139,26,26,0.35)',
        },
      },
      backgroundImage: {
        'bolt-gradient': 'linear-gradient(135deg, #0a0f2e 0%, #05071a 50%, #000000 100%)',
        'glass-card': 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
        'maroon-glow': 'radial-gradient(ellipse at center, rgba(139,26,26,0.3) 0%, transparent 70%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        'glass-hover': '0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)',
        maroon: '0 0 20px rgba(139,26,26,0.5)',
        'maroon-sm': '0 0 10px rgba(139,26,26,0.4)',
      },
      animation: {
        'pulse-maroon': 'pulseMaroon 2s ease-in-out infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        pulseMaroon: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(139,26,26,0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(139,26,26,0.8)' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
