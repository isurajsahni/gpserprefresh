/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand = the landing page's deep editorial green.
        brand: {
          50: '#eef5f0',
          100: '#d6e7dc',
          200: '#aecfba',
          500: '#0e7048', // navy-soft
          600: '#0c6440',
          700: '#0b5d3b', // navy (primary)
          800: '#08482e',
          900: '#0d2a1c', // ink
        },
        // Gold accent from the landing page.
        accent: {
          50: '#f7efd9',
          100: '#f0e6cd',
          200: '#e4d09a',
          500: '#b8902e',
          600: '#a17d27',
          700: '#876820',
        },
        // Warm paper backgrounds.
        cream: {
          DEFAULT: '#f4f0e6',
          card: '#fbf8f1',
        },
        // Warm the neutral ramp (stone) so panels sit nicely on cream.
        gray: {
          50: '#faf9f7',
          100: '#f4f2ed',
          200: '#e7e4dc',
          300: '#d6d2c7',
          400: '#a8a294',
          500: '#78736a',
          600: '#57534b',
          700: '#44413a',
          800: '#292621',
          900: '#1c1a16',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
