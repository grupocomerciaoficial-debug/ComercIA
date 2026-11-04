/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta oficial ComercIA
        navy: '#1A3A4A',
        teal: '#2D8C7A',
        orange: '#F4A623',
        sand: '#F2E8D9',
        paper: '#F9F6F1',
        mint: '#E8F4F0',

        // Tokens semánticos y compatibilidad
        ink: '#1A3A4A',
        sea: '#2D8C7A',
        'sea-dark': '#226d5f',
        cloud: '#F2E8D9',
        line: '#E2EBE8',
        muted: '#637982',

        // Estados de pedido
        status: {
          pendiente: '#F4A623',
          'pendiente-bg': '#FDF0D8',
          'pendiente-text': '#6B4300',
          procesado: '#1A3A4A',
          'procesado-bg': '#DDE7EC',
          'procesado-text': '#1A3A4A',
          confirmado: '#2D8C7A',
          'confirmado-bg': '#E8F4F0',
          'confirmado-text': '#1F6557',
          cancelado: '#C0392B',
          'cancelado-bg': '#F8E1DE',
          'cancelado-text': '#8A2A1F',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(26,58,74,0.04), 0 4px 12px rgba(26,58,74,0.03)',
        card: '0 2px 8px rgba(26,58,74,0.04), 0 12px 28px rgba(26,58,74,0.06)',
        lift: '0 14px 38px rgba(26,58,74,0.09)',
        modal: '0 24px 60px rgba(26,58,74,0.22), 0 4px 16px rgba(26,58,74,0.08)',
      },
    },
  },
  plugins: [],
};
