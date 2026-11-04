import { SiteHeader } from '@/components/site-header';
import { PublicLegalDocument } from '@/components/legal-document';

export const metadata = { title: '약관·정책 · WePlay' };

/** 현재 게시된 약관 (로그인 없이 볼 수 있음) */
export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main><PublicLegalDocument /></main>
    </div>
  );
}
