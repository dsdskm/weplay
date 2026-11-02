'use client';

import { InfoEditForm } from '@/components/info-edit-form';
import { useGroup, useGroupId } from '@/lib/hooks';

export default function AdminSettingsPage() {
  const groupId = useGroupId();
  const { data: group } = useGroup();
  if (!group) return <p className="text-slate-400">불러오는 중…</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">그룹 설정</h1>
      <InfoEditForm path={`/groups/${groupId}`} queryKey={['group', groupId]} name={group.name} description={group.description} />
    </div>
  );
}
