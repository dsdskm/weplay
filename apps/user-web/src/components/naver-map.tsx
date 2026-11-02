'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    naver?: any;
  }
}

export interface MapPlace {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  highlight?: boolean;
}

const CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

function loadNaver(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.naver?.maps) return resolve();
    const existing = document.getElementById('naver-map-sdk');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const s = document.createElement('script');
    s.id = 'naver-map-sdk';
    s.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${CLIENT_ID}`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('네이버 지도를 불러오지 못했어요'));
    document.head.appendChild(s);
  });
}

/** 네이버 지도에 장소 마커 표시. NEXT_PUBLIC_NAVER_MAP_CLIENT_ID 가 없으면 안내 문구 */
export function NaverMap({ places, height = 320 }: { places: MapPlace[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();
  const located = places.filter((p) => p.lat != null && p.lng != null);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadNaver()
      .then(() => {
        if (cancelled || !ref.current || !window.naver?.maps) return;
        const maps = window.naver.maps;
        const first = located[0];
        const map = new maps.Map(ref.current, {
          center: new maps.LatLng(first?.lat ?? 37.5665, first?.lng ?? 126.978),
          zoom: located.length ? 14 : 11,
        });
        const bounds = new maps.LatLngBounds();
        located.forEach((p) => {
          const pos = new maps.LatLng(p.lat as number, p.lng as number);
          const marker = new maps.Marker({
            position: pos,
            map,
            title: p.name,
            icon: p.highlight ? { content: '<div style="font-size:26px">📍</div>', anchor: new maps.Point(13, 26) } : undefined,
          });
          const info = new maps.InfoWindow({ content: `<div style="padding:6px 10px;font-size:12px">${p.name.replace(/</g, '&lt;')}</div>` });
          maps.Event.addListener(marker, 'click', () => info.open(map, marker));
          bounds.extend(pos);
        });
        if (located.length > 1) map.fitBounds(bounds);
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(located.map((p) => [p.id, p.lat, p.lng, p.highlight]))]);

  if (!CLIENT_ID) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-slate-100 p-6 text-center text-sm text-slate-500" style={{ height }}>
        지도를 보려면 환경변수 NEXT_PUBLIC_NAVER_MAP_CLIENT_ID 를 설정해 주세요.
        <br />
        (장소 목록은 아래에서 그대로 볼 수 있어요)
      </div>
    );
  }
  if (error) return <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-600">{error}</div>;
  return <div ref={ref} className="w-full overflow-hidden rounded-2xl" style={{ height }} />;
}
