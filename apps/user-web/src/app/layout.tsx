import type { Metadata } from 'next';
import './globals.css';
import { InactiveGate } from '@/components/inactive-gate';
import { Providers } from '@/components/providers';
import { TermsGate } from '@/components/terms-gate';
import { LegalFooter } from '@/components/legal-footer';

export const metadata: Metadata = { title: 'WePlay', description: '그룹 생활을 게임처럼' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <InactiveGate><TermsGate>{children}</TermsGate></InactiveGate>
          <LegalFooter />
        </Providers>
      </body>
    </html>
  );
}
