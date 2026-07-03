/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── OBS brand palette ──────────────────────────────
        brand: {
          DEFAULT: '#C99E25', // primary gold
          dark: '#8E6B1D', // hover gold
          soft: '#FAF4E3', // tint / chip bg
          light: '#E5C060', // gradient start
        },
        ink: {
          DEFAULT: '#333333', // headings
          soft: '#4F4F4F', // body
          mute: '#999999', // secondary
          faint: '#CCCCCC',
        },
        line: '#E8E8E8', // borders
        surface: '#F5F5F5', // inputs / subtle bg
        footer: '#333338',
        success: '#1EA83C',
      },
      fontFamily: {
        sans: ['Roboto', 'Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        container: '1240px',
      },
      boxShadow: {
        header: '0 1px 6px rgba(0,0,0,.06)',
        card: '0 1px 4px rgba(0,0,0,.08)',
        cardHover: '0 6px 20px rgba(0,0,0,.14)',
        pop: '0 6px 20px rgba(0,0,0,.14)',
        panel: '0 4px 20px rgba(0,0,0,.06)',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        fadeUp: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'none' } },
        slideUp: { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        scaleIn: { from: { transform: 'scale(.5)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-4px)' }, '75%': { transform: 'translateX(4px)' } },
      },
      animation: {
        fadeUp: 'fadeUp .25s ease',
        slideUp: 'slideUp .3s ease',
        scaleIn: 'scaleIn .4s ease-out',
        shake: 'shake .15s ease 2',
      },
    },
  },
  plugins: [],
};
