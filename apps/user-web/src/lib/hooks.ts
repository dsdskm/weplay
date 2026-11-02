'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { api, tokenStore } from './api';
import type { GroupHome, Me, MyGroup } from './types';

export const LAST_GROUP_KEY = 'wp_last_group';

export function useRequireAuth() {
  const router = useRouter();
  useEffect(() => {
    if (!tokenStore.get()) router.replace('/login');
  }, [router]);
}

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/me'), enabled: !!tokenStore.get() });
}

export function useMyGroups(refetchInterval?: number) {
  return useQuery({
    queryKey: ['me', 'groups'],
    queryFn: () => api<MyGroup[]>('/me/groups'),
    enabled: !!tokenStore.get(),
    refetchInterval,
  });
}

export function logout() {
  tokenStore.clear();
  localStorage.removeItem(LAST_GROUP_KEY);
  window.location.href = '/login';
}

export function useGroupId() {
  return useParams<{ groupId: string }>().groupId;
}

export function useGroup() {
  const groupId = useGroupId();
  return useQuery({ queryKey: ['group', groupId], queryFn: () => api<GroupHome>(`/groups/${groupId}`) });
}

/** 그룹에서 사용 중(승인된)인 기능 목록. 메뉴 노출에 사용 */
export function useFeatureFlags(groupId: string, enabled = true) {
  const { data } = useQuery({
    queryKey: ['group', groupId, 'feature-flags'],
    queryFn: () => api<{ key: string; status: string | null; active?: boolean }[]>(`/groups/${groupId}/features`),
    enabled: enabled && !!tokenStore.get(),
  });
  const on = new Set((data ?? []).filter((f) => f.status === 'APPROVED' && f.active !== false).map((f) => f.key));
  return { isOn: (key: string) => on.has(key), loaded: !!data };
}
