import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0B0D1F', // 앱 배경 (토요일 밤 추첨 분위기)
          900: '#0B0D1F',
          800: '#14172E', // 카드
          700: '#1C2040', // 카드 위 요소
          600: '#2A2F55', // 구분선
          500: '#3A4070',
        },
        fog: {
          DEFAULT: '#F4F5FF',
          300: '#A3A8CC',
          400: '#8A8FB8',
          500: '#6E7399',
        },
        gold: { DEFAULT: '#FFC94A', deep: '#F5A524', soft: '#FFE7A8' },
        chewy: { DEFAULT: '#FF5C8A', soft: '#FF9AB8' }, // 쫄깃 포인트 컬러
        gain: '#FF5C6C', // 수익(+) — 국내 금융 관례(빨강)
        loss: '#4C8DFF', // 손실(-) — 국내 금융 관례(파랑)
        // 동행복권 공 색상
        ball: {
          y: '#FBC400', // 1~10
          b: '#69C8F2', // 11~20
          r: '#FF7272', // 21~30
          g: '#AAAAAA', // 31~40
          n: '#B0D840', // 41~45
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'Apple SD Gothic Neo', 'Malgun Gothic', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35)',
        glow: '0 0 0 2px #FFC94A, 0 0 18px 4px rgba(255, 201, 74, 0.65)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2.4s linear infinite',
        floaty: 'floaty 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
