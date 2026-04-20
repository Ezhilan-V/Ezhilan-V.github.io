module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dark-bg':      '#080b14',
        'dark-surface': '#0d1117',
        'dark-card':    '#161b22',
        'dark-border':  '#1e2d3d',
        'brand-blue':   '#0ea5e9',
        'brand-purple': '#8b5cf6',
        'brand-cyan':   '#22d3ee',
      },
      animation: {
        'spin-slow':   'spin 10s linear infinite',
        'scroll-dot':  'scrollDot 2s ease-in-out infinite',
        'float':       'float 6s ease-in-out infinite',
        'fadeIn':      'fadeIn 0.5s ease-out forwards',
        'slideIn':     'slideIn 0.5s ease-out forwards',
        'slideDown':   'slideDown 0.3s ease-out forwards',
        'pulse-slow':  'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        scrollDot: {
          '0%, 100%': { opacity: '0', transform: 'translateY(0)' },
          '50%':      { opacity: '1', transform: 'translateY(12px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%':   { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow-blue':   '0 0 30px rgba(14, 165, 233, 0.3)',
        'glow-purple': '0 0 30px rgba(139, 92, 246, 0.3)',
        'glow-cyan':   '0 0 30px rgba(34, 211, 238, 0.3)',
      },
    },
  },
  plugins: [],
};
