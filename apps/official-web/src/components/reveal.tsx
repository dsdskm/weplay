'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** 화면에 들어오면 아래에서 위로 부드럽게 나타남 */
export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`transition-all duration-700 ease-out ${on ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} ${className}`}>
      {children}
    </div>
  );
}
