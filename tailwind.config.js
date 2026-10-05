/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontSize: {
        '2xs': ['0.75rem', { lineHeight: '1.125rem' }],     // 12.75px at 17px root
        xs: ['0.8235rem', { lineHeight: '1.25rem' }],       // ~14px at 17px root
        sm: ['0.9412rem', { lineHeight: '1.375rem' }],      // ~16px at 17px root
        base: ['1.0588rem', { lineHeight: '1.55rem' }],     // ~18px at 17px root
        lg: ['1.1765rem', { lineHeight: '1.75rem' }],       // ~20px at 17px root
        xl: ['1.3529rem', { lineHeight: '1.875rem' }],      // ~23px at 17px root
        '2xl': ['1.647rem', { lineHeight: '2.15rem' }],     // ~28px at 17px root
        '3xl': ['2rem', { lineHeight: '2.4rem' }],          // ~34px at 17px root
      },
      spacing: {
        '0.5': '0.15rem',
        '1': '0.28rem',
        '1.5': '0.42rem',
        '2': '0.56rem',
        '2.5': '0.7rem',
        '3': '0.85rem',
        '3.5': '1rem',
        '4': '1.15rem',
        '5': '1.4rem',
        '6': '1.7rem',
      },
      screens: {
        xs: '480px',
        pos: '1280px',
        'pos-xl': '1600px',
      },
    },
  },
  plugins: [],
};
