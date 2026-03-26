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
          bg:           '#000000',
          surface:      '#0a0a0f',
          surface2:     '#111118',
          accent:       '#4f46e5',
          'accent-light': '#6366f1',
          'accent-dim':   'rgba(79,70,229,0.25)',
          glass:        'rgba(255,255,255,0.04)',
          border:       'rgba(255,255,255,0.08)',
          'border-hover': 'rgba(255,255,255,0.14)',
        },
      },
      backgroundImage: {
        'bolt-gradient':  'linear-gradient(160deg, #0a0a0f 0%, #05050a 60%, #000000 100%)',
        'glass-card':     'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        'accent-glow':    'radial-gradient(ellipse at center, rgba(79,70,229,0.2) 0%, transparent 70%)',
      },
      boxShadow: {
        glass:        '0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-hover':'0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.10)',
        accent:       '0 0 20px rgba(79,70,229,0.45)',
        'accent-sm':  '0 0 10px rgba(79,70,229,0.35)',
      },
      animation: {
        'pulse-accent':  'pulseAccent 2s ease-in-out infinite',
        'slide-in-right':'slideInRight 0.3s ease-out',
        'slide-up':      'slideUp 0.2s ease-out',
        'fade-in':       'fadeIn 0.15s ease-out',
        'scale-in':      'scaleIn 0.15s ease-out',
      },
      keyframes: {
        pulseAccent: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(79,70,229,0.3)' },
          '50%':      { boxShadow: '0 0 22px rgba(79,70,229,0.65)' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(16px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        scaleIn: {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to:   { transform: 'scale(1)',    opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
