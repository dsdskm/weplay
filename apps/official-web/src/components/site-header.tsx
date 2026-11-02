import Link from 'next/link';
import { APP_URL } from '@/lib/public-api';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <Link href="/" className="text-xl font-black tracking-tight">
          We<span className="text-violet-600">Play</span>
        </Link>
        <nav className="ml-auto hidden gap-5 text-sm font-semibold text-slate-600 md:flex">
          <a href="#features" className="hover:text-violet-600">기능</a>
          <a href="#games" className="hover:text-violet-600">게임</a>
          <a href="#fair" className="hover:text-violet-600">공정한 순위</a>
          <Link href="/notices" className="hover:text-violet-600">공지</Link>
          <Link href="/terms" className="hover:text-violet-600">약관</Link>
        </nav>
        <a href={APP_URL} className="ml-auto rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg md:ml-0">
          시작하기
        </a>
      </div>
    </header>
  );
}
