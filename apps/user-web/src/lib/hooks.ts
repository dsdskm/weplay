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
