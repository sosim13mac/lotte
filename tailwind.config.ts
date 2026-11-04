import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#F1FBF7', // 앱 배경 (연한 민트)
          900: '#F1FBF7',
          800: '#FFFFFF', // 카드
          700: '#EAF8F2', // 카드 위 요소
          600: '#D6EFE5', // 구분선
          500: '#BFE6D6',
        },
        fog: {
          DEFAULT: '#0A3329',
          300: '#3F6B5F',
          400: '#4A7466',
          500: '#547A6C',
        },
        gold: { DEFAULT: '#12A178', deep: '#0B6B52', soft: '#3CC49A' }, // 브랜드 민트
        deep: '#04261E', // 민트/코랄 채움 위 글자색
        chewy: { DEFAULT: '#FF6B57', soft: '#FF9A8B', deep: '#C2412E' }, // 쫄깃 포인트 컬러 (코랄)
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
        card: '0 1px 0 rgba(255,255,255,0.7) inset, 0 8px 24px rgba(20,120,90,0.08)',
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
