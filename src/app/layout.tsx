import type { Metadata, Viewport } from 'next';
import { Black_Han_Sans, Noto_Sans_KR } from 'next/font/google';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import './globals.css';

const sans = Noto_Sans_KR({ subsets: ['latin'], variable: '--font-sans', display: 'swap', preload: false });
const display = Black_Han_Sans({ subsets: ['latin'], weight: '400', variable: '--font-display', display: 'swap', preload: false });

export const metadata: Metadata = {
  title: { default: '쫄깃로또', template: '%s · 쫄깃로또' },
  description: '추천보다 재미있게 — 내 로또 생활을 쫄깃하게 관리하는 앱',
  applicationName: '쫄깃로또',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: '쫄깃로또', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#F1FBF7',
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
