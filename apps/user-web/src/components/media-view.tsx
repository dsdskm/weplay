'use client';

import { assetUrl } from '@/lib/api';

/** 업로드된 사진·영상 표시 */
export function MediaView({ url, type, className = '' }: { url: string; type: string; className?: string }) {
  const src = assetUrl(url);
  if (type === 'VIDEO') return <video src={src} controls preload="metadata" className={`bg-black object-contain ${className}`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" className={`object-cover ${className}`} />;
}
