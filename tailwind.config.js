module.exports = {
  mode: 'jit',
  purge: {
    content: ['./src/**/*.{html,ts}'],
  },
  darkMode: false,
  theme: {
    extend: {
      animation: {
        'fadeIn': 'fadeIn 0.5s ease-out forwards',
        'slideIn': 'slideIn 0.5s ease-out forwards',
        'slideDown': 'slideDown 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { 
            opacity: '0',
            transform: 'translateX(-20px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)'
          },
        },
        slideDown: {
          '0%': {
            opacity: '0',
            transform: 'translateY(-10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          },
        },
      },
    },
  },
  variants: {
    extend: {
      scale: ['hover', 'group-hover'],
      transform: ['hover', 'group-hover'],
    },
  },
  plugins: [],
};