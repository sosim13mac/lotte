/**
 * 환경 설정.
 * NEXT_PUBLIC_* 값은 빌드 시 인라인되므로 반드시 리터럴 접근(process.env.NEXT_PUBLIC_X)으로 읽습니다.
 */

/** 백엔드: 'neon' 이면 Neon DB + Better Auth, 그 외에는 로그인 없이 동작하는 데모 모드 */
export const BACKEND = process.env.NEXT_PUBLIC_BACKEND ?? '';

/** 데모 모드: 로그인 없이 브라우저 localStorage 의 샘플 데이터로 동작 */
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === '1' || BACKEND !== 'neon';

/** Google 로그인 버튼 노출 여부 (서버에 GOOGLE_CLIENT_ID/SECRET 이 있을 때 1 로 설정) */
export const GOOGLE_LOGIN = process.env.NEXT_PUBLIC_GOOGLE_LOGIN === '1';
