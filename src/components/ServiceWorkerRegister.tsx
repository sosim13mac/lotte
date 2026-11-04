'use client';

import { useEffect } from 'react';

/** PWA 서비스 워커 등록 (개발 모드에서는 캐시 혼선을 막기 위해 NEXT_PUBLIC_SW_DEV=1 일 때만) */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_SW_DEV !== '1') return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((e) => {
      console.warn('[sw] 등록 실패', e);
    });
  }, []);
  return null;
}
