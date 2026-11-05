import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#F0F6FF', // 앱 배경 (연한 하늘색)
          900: '#F0F6FF',
          800: '#FFFFFF', // 카드
          700: '#E7F0FF', // 카드 위 요소
          600: '#D2E2FA', // 구분선
          500: '#B7CFF5',
        },
        fog: {
          DEFAULT: '#0E2358', // 로고 외곽선 남색
          300: '#3B4E86',
          400: '#46598F',
          500: '#51659A',
        },
        gold: { DEFAULT: '#1F63E0', deep: '#1648B0', soft: '#4D8BF2' }, // 브랜드 로열블루 (로고 배경색)
        deep: '#0B1B45', // 노랑·공 색 채움 위 글자색 (파랑 채움 위는 text-white)
        chewy: { DEFAULT: '#FFC928', soft: '#FFD95E', deep: '#8A5A00' }, // 포인트 컬러 (로고 노랑)
        gain: '#D92D45', // 수익(+) — 국내 금융 관례(빨강)
        loss: '#2563EB', // 손실(-) — 국내 금융 관례(파랑)
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
        card: '0 1px 0 rgba(255,255,255,0.7) inset, 0 8px 24px rgba(30,80,200,0.10)',
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
