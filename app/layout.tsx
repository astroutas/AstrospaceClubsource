import type { Metadata } from 'next';
import { Tajawal } from 'next/font/google';
import './globals.css';
import { SiteShell } from '@/components/club/core';
import { Splash } from '@/components/club/splash';
const tajawal = Tajawal({
  variable: '--font-arabic',
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});
export const metadata: Metadata = {
  title: 'Astrospace Club | نادي الفلك والفضاء',
  description:
    'سماء واحدة، فضول بلا حدود. تابع Astrospace Club على إنستغرام وانضم إلى مجموعة النادي عبر واتساب.',
  icons: { icon: '/favicon.svg' },
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Astrospace', statusBarStyle: 'black-translucent' },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={tajawal.variable}>
        <SiteShell>{children}</SiteShell>
        <Splash />
      </body>
    </html>
  );
}
