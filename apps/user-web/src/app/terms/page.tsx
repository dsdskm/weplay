import { PublicLegalDocument } from '@/components/legal-document';
import { SimpleShell } from '@/components/simple-shell';
export default function TermsPage() {
  return <SimpleShell requireAuth={false}><PublicLegalDocument /></SimpleShell>;
}
