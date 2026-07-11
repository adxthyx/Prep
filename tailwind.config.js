/** Theme tokens mirror the portfolio's Reddit-orange system (see src/index.css). */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Reddit Sans', 'system-ui', 'sans-serif'],
        mono: ['Reddit Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: {
          DEFAULT: '#FF4500',
          hover: '#E03E00',
          subtle: 'rgb(255 69 0 / 0.1)',
        },
        downvote: '#7193FF',
        canvas: 'hsl(var(--canvas))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        surface: 'hsl(var(--surface))',
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        border: 'hsl(var(--border))',
      },
      borderRadius: { lg: '0.5rem' },
    },
  },
  plugins: [],
}
