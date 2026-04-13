/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./frontend/views/**/*.hbs",
    "./frontend/public/js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#0891b2',
          100: '#e0f2fe',
          200: '#3b82f6',
          300: '#1e40af',
          400: '#2dd4bf',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        desert: {
          50: '#fef2f2',
          100: '#fef3c7',
          200: '#fed7aa',
          300: '#fde68a',
          400: '#fcd34d',
          500: '#fbbf24',
          600: '#f59e0b',
          700: '#d97706',
          800: '#b45309',
          900: '#78350f',
        },
        sage: {
          50: '#f7fafc',
          100: '#f3f4e5',
          200: '#e5e7eb',
          300: '#d1fae5',
          400: '#a78bfa',
          500: '#6b7280',
          600: '#9ca3af',
          700: '#d2d6a4',
          800: '#e5e7eb',
          900: '#1f2937',
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
