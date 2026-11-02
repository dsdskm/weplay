'use client';

/** 구성원이 획득한 배지 아이콘 목록 (반복 획득 배지는 횟수 표시) */
export function BadgeIcons({ badges }: { badges?: { key: string; name: string; icon: string; count?: number }[] }) {
  if (!badges?.length) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {badges.map((b) => (
        <span key={b.key} title={b.name} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs">
          {b.icon}
          {b.count && b.count > 1 ? `×${b.count}` : ''}
        </span>
      ))}
    </span>
  );
}
