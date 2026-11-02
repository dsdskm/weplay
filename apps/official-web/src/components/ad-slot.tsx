/**
 * 광고 자리 (추후 광고 도입용). NEXT_PUBLIC_AD_SLOT_ENABLED=true 일 때만 보이고, 기본은 아무것도 그리지 않음.
 * 광고 정책·심사·개인정보 동의 흐름은 도입 전에 따로 정해야 함.
 */
import { AD_SLOT_ENABLED } from '@/lib/public-api';

export function AdSlot({ label = '광고' }: { label?: string }) {
  if (!AD_SLOT_ENABLED) return null;
  return (
    <aside aria-label={label} className="mx-auto my-10 flex h-28 max-w-3xl items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/60 text-xs text-slate-400">
      {label}
    </aside>
  );
}
