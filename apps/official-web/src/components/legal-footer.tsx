import { APP_URL } from '@/lib/public-api';

export function LegalFooter() {
    return <footer className="border-t border-slate-200/70 bg-white/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-slate-500 md:flex-row md:flex-wrap md:items-center">
            <p className="font-bold text-slate-700">WePlay</p>
            <nav aria-label="약관 및 정책" className="flex flex-wrap gap-x-5 gap-y-3 md:ml-auto">
                <a href="/notices" className="hover:text-slate-800">공지</a>
                <a href="/terms?type=SERVICE" className="hover:text-slate-800">서비스 이용약관</a>
                <a href="/terms?type=PRIVACY" className="font-semibold hover:text-slate-800">개인정보 처리방침</a>
                <a href={`${APP_URL}/support`} className="hover:text-slate-800">문의</a>
            </nav>
            <p className="text-xs">© WePlay. 포인트는 회사 안에서만 쓰는 활동 점수예요.</p>
        </div>
    </footer>;
}