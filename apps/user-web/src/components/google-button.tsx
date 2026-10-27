'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: any;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  const render = useCallback(() => {
    if (!CLIENT_ID || !window.google || !ref.current) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (res: { credential: string }) => onCredential(res.credential),
    });
    window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', width: 320, text: 'continue_with', locale: 'ko' });
  }, [onCredential]);

  useEffect(() => {
    if (loaded || window.google) render();
  }, [loaded, render]);

  if (!CLIENT_ID) {
    return (
      <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
        Google 로그인이 아직 설정되지 않았습니다. (<code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>)
      </div>
    );
  }
  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => setLoaded(true)} />
      <div ref={ref} className="flex justify-center" />
    </>
  );
}
