'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { api, tokenStore } from './api';
import type { CompanyHome, Me, MyCompany } from './types';

export const LAST_COMPANY_KEY = 'wp_last_company';

export function useRequireAuth() {
  const router = useRouter();
  useEffect(() => {
    if (!tokenStore.get()) router.replace('/login');
  }, [router]);
}

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/me'), enabled: !!tokenStore.get() });
}

export function useMyCompanies(refetchInterval?: number) {
  return useQuery({
    queryKey: ['me', 'companies'],
    queryFn: () => api<MyCompany[]>('/me/companies'),
    enabled: !!tokenStore.get(),
    refetchInterval,
  });
}

export function logout() {
  tokenStore.clear();
  localStorage.removeItem(LAST_COMPANY_KEY);
  window.location.href = '/login';
}

export function useCompanyId() {
  return useParams<{ companyId: string }>().companyId;
}

export function useCompany() {
  const companyId = useCompanyId();
  return useQuery({ queryKey: ['company', companyId], queryFn: () => api<CompanyHome>(`/companies/${companyId}`) });
}
