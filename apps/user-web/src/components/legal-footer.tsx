'use client';

import { usePathname } from 'next/navigation';

export function LegalFooter() {
    const pathname = usePathname();
    return <footer className={`border-t border-slate-100 bg-white px-4 pt-5 text-xs text-slate-500 ${pathname.startsWith('/g/') ? 'pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-5' : 'pb-5'}`}>
        <nav aria-label="약관 및 정책" className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-6 gap-y-3">
            <a href="/terms?type=SERVICE" className="py-2 hover:underline">서비스 이용약관</a>
            <a href="/terms?type=PRIVACY" className="py-2 font-semibold hover:underline">개인정보 처리방침</a>
        </nav>
    </footer>;
}