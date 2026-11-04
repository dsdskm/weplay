import { PublicLegalDocument } from '@/components/legal-document';

export const metadata = { title: '약관 및 정책 · WePlay' };

export default function PublicTermsPage() {
    return <main className="min-h-screen"><PublicLegalDocument /></main>;
}