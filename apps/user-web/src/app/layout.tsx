import type { Metadata } from 'next';
import './globals.css';
import { InactiveGate } from '@/components/inactive-gate';
import { Providers } from '@/components/providers';

export const metadata: Metadata = { title: 'WePlay', description: '그룹 생활을 게임처럼' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <InactiveGate>{children}</InactiveGate>
        </Providers>
      </body>
    </html>
  );
}
