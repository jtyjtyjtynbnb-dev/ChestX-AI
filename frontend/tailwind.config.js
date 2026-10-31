/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    screens: { xs: '375px', sm: '576px', md: '768px', lg: '992px', xl: '1200px', '2xl': '1440px' },
    extend: {
      colors: {
        primary: '#0F62FE', 'primary-dark': '#0047AB', success: '#00B42A',
        warning: '#FF8A00', danger: '#F53F3F', info: '#36BFFA',
        'page-bg': '#F4F7FB', 'card-bg': '#FFFFFF', 'text-1': '#0B1B33',
        'text-2': '#4E5969', 'text-3': '#86909C', 'border-line': '#E2E8F2'
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'sans-serif']
      }
    }
  },
  plugins: []
};
