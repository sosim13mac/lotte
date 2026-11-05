import type { Metadata, Viewport } from 'next';
import { Black_Han_Sans, Noto_Sans_KR } from 'next/font/google';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import './globals.css';

const sans = Noto_Sans_KR({ subsets: ['latin'], variable: '--font-sans', display: 'swap', preload: false });
const display = Black_Han_Sans({ subsets: ['latin'], weight: '400', variable: '--font-display', display: 'swap', preload: false });

export const metadata: Metadata = {
  title: { default: '로또당', template: '%s · 로또당' },
  description: '추천보다 재미있게 — 내 로또 생활을 쫄깃하게 관리하는 앱',
  applicationName: '로또당',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: '로또당', statusBarStyle: 'black-translucent' },
  openGraph: {
    title: '로또당',
    description: '추천보다 재미있게 — 내 로또 생활을 쫄깃하게 관리하는 앱',
    images: [{ url: '/brand/og.png', width: 1200, height: 630, alt: '로또당' }],
    locale: 'ko_KR',
    type: 'website',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#F0F6FF',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${sans.variable} ${display.variable}`}>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
