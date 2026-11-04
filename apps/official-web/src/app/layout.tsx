import type { Metadata } from 'next';
import './globals.css';
import { LegalFooter } from '@/components/legal-footer';

export const metadata: Metadata = {
  title: 'WePlay · 회사 생활을 게임처럼',
  description: '짧은 미니게임, 턴제 게임, 칭찬 카드, 이달의 사원, 공통 업무까지. 팀이 가까워지는 가벼운 게임 플랫폼.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}<LegalFooter /></body>
    </html>
  );
}
