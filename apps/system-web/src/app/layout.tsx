import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { LegalFooter } from '@/components/legal-footer';

export const metadata: Metadata = { title: 'WePlay System' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}<LegalFooter /></Providers>
      </body>
    </html>
  );
}
