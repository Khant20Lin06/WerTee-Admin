import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary:             '#5B4FE9',
        'primary-surface':   '#EEF0FF',
        'primary-border':    '#C8C4F8',
        'primary-hover':     '#4A3FD4',
        bg:                  '#F0EFFB',
        card:                '#FFFFFF',
        surface1:            '#F6F5FF',
        surface2:            '#EEEEFF',
        border:              '#E8E6F8',
        'text-primary':      '#1A1730',
        'text-secondary':    '#4A4770',
        'text-muted':        '#8A88A8',
        'st-prep-text':      '#E06520',
        'st-prep-bg':        '#FFF3EC',
        'st-del-text':       '#5B4FE9',
        'st-del-bg':         '#EEF0FF',
        'st-done-text':      '#16A660',
        'st-done-bg':        '#E8FAF2',
        'st-cancel-text':    '#D84040',
        'st-cancel-bg':      '#FFF0F0',
        'st-pending-text':   '#D4820A',
        'st-pending-bg':     '#FFF8E8',
      },
      borderRadius: {
        card: '12px',
        pill: '999px',
      },
      width:  { sidebar: '188px' },
      minWidth: { sidebar: '188px' },
      height: { topbar: '48px' },
    },
  },
  plugins: [],
};

export default config;
