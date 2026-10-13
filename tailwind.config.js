export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* Brand greens — from the approved 4-swatch palette */
        pine: {
          DEFAULT: '#408A71',
          deep: '#091413',
          moss: '#285A48',
          mist: '#B0E4CC',
          wash: '#EFF7F2',
        },
        paper: '#f6f9f7',
        hairline: '#e4ece8',
        indigo: {
          50: '#EFF7F2',
          100: '#DCEFE4',
          200: '#B0E4CC',
          300: '#7FBC9B',
          400: '#5AA87F',
          500: '#408A71',
          600: '#37725D',
          700: '#285A48',
          800: '#1C4435',
          900: '#123026',
          950: '#091413',
        },
        slate: {
          850: '#16252e',
          900: '#0f1f27',
          950: '#081418',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        display: ['"Space Grotesk"', 'Poppins', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(8, 39, 32, 0.05), 0 8px 24px -16px rgba(8, 39, 32, 0.18)',
      },
      borderRadius: { ledger: '1rem' },
    },
  },
  plugins: [],
};
