/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      /**
       * Compact desktop widget tokens (300–360px friendly)
       * Avoid arbitrary values; use these utilities instead.
       */
      colors: {
        profit: 'var(--color-profit)',
        loss: 'var(--color-loss)',
        gold: 'var(--color-gold)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        panel: 'var(--color-panel)',
        'panel-2': 'var(--color-panel-2)',
        divider: 'var(--color-divider)',
      },
      fontSize: {
        // Semantic typography (preferred)
        meta: ['10px', { lineHeight: '14px', letterSpacing: '0.02em' }],
        label: ['12px', { lineHeight: '16px' }],
        body: ['14px', { lineHeight: '18px' }],
        symbol: ['16px', { lineHeight: '20px', letterSpacing: '-0.01em' }],
        price: ['18px', { lineHeight: '22px', letterSpacing: '-0.01em' }],
        pnl: ['22px', { lineHeight: '26px', letterSpacing: '-0.015em' }],

        // Also normalize core sizes to match widget scale
        xs: ['10px', { lineHeight: '14px' }],
        sm: ['12px', { lineHeight: '16px' }],
        base: ['14px', { lineHeight: '18px' }],
        lg: ['18px', { lineHeight: '22px' }],
        xl: ['20px', { lineHeight: '24px' }],
        '2xl': ['22px', { lineHeight: '26px' }],
      },
      borderRadius: {
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        // Subtle panel shadow (avoid heavy)
        panel: '0 1px 2px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.04)',
      },
    },
  },
}

