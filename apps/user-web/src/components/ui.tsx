import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  ghost: 'text-slate-600 hover:bg-slate-100',
};

export function Button({ variant = 'primary', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...p}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
    />
  );
}

export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...p}
      className={cn(
        'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
        className,
      )}
    />
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100', className)}>{children}</div>;
}

export function Badge({ tone = 'slate', children }: { tone?: 'slate' | 'brand' | 'amber' | 'green' | 'rose'; children: ReactNode }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    brand: 'bg-brand-100 text-brand-700',
    amber: 'bg-amber-100 text-amber-800',
    green: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
  };
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}

export function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  if (url) return <img src={url} alt={name} width={size} height={size} className="rounded-full object-cover" />;
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700"
    >
      {name.slice(0, 1)}
    </div>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-rose-600">{children}</p>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">{children}</div>;
}

export function Logo() {
  return (
    <span className="text-xl font-black tracking-tight">
      We<span className="text-brand-600">Play</span>
    </span>
  );
}
