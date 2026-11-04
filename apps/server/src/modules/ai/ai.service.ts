import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { parseUploadUrl, readUploadBuffer } from '../uploads/uploads.service';

/**
 * 외부 AI 호출 (선택 기능). 키가 없거나 호출이 실패하면 null 을 돌려주고,
 * 호출한 쪽이 기본 콘텐츠(문제 은행 등)로 대체한다. 서비스가 AI 없이도 항상 동작하도록 하기 위함.
 * - ANTHROPIC_API_KEY: 텍스트·사진 판정 (AI_TEXT_MODEL, 기본 claude-haiku-5-5)
 * - IMAGE_API_URL / IMAGE_API_KEY / IMAGE_MODEL: 그림 생성·변환 (OpenAI 호환 images API)
 */
const TEXT_MODEL = process.env.AI_TEXT_MODEL ?? 'claude-haiku-5-5';
const TEXT_TIMEOUT = 20_000;
const IMAGE_TIMEOUT = 90_000;
const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };

/** 모델 응답에서 JSON 추출 (코드펜스·설명 문장이 섞여도 첫 번째 배열/객체를 찾음) */
export function parseJson<T>(text: string): T | null {
  const m = text.match(/[\[{][\s\S]*[\]}]/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}

@Injectable()
export class AiService {
  private readonly log = new Logger('AiService');

  get textEnabled() {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  get imageEnabled() {
    return !!process.env.IMAGE_API_KEY && !!process.env.IMAGE_API_URL;
  }

  /** 텍스트 응답. 키가 없거나 실패하면 null */
  async text(prompt: string, system?: string, maxTokens = 800): Promise<string | null> {
    if (!this.textEnabled) return null;
    return this.anthropic({ model: TEXT_MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: prompt }] });
  }

  /** JSON 응답. 파싱 실패하면 null */
  async json<T>(prompt: string, maxTokens = 800): Promise<T | null> {
    const t = await this.text(prompt, 'JSON 만 출력하세요. 설명 문장은 붙이지 마세요.', maxTokens);
    return t ? parseJson<T>(t) : null;
  }

  /** 사진을 보고 답하기 (AI Vision). 업로드된 이미지만 허용 */
  async vision(mediaUrl: string, prompt: string, maxTokens = 400): Promise<string | null> {
    if (!this.textEnabled) return null;
    const image = await this.imagePayload(mediaUrl);
    if (!image) return null;
    return this.anthropic({
      model: TEXT_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: image.mime, data: image.data } }, { type: 'text', text: prompt }] }],
    });
  }

  async visionJson<T>(mediaUrl: string, prompt: string, maxTokens = 400): Promise<T | null> {
    const t = await this.vision(mediaUrl, `${prompt}\nJSON 만 출력하세요.`, maxTokens);
    return t ? parseJson<T>(t) : null;
  }

  /** 빙고 사진 판정: 미션에 맞는지. 판정이 안 되면 null (호출한 쪽은 통과시킴) */
  async judgePhoto(mediaUrl: string, mission: string): Promise<{ match: boolean; reason: string } | null> {
    const r = await this.visionJson<{ match: boolean; reason?: string }>(
      mediaUrl,
      `이 사진이 미션 "${mission}"에 맞는 사진인지 판단하세요. {"match": true 또는 false, "reason": "한 줄 이유(한국어)"} 형식으로만 답하세요.`,
    );
    return r && typeof r.match === 'boolean' ? { match: r.match, reason: r.reason ?? '' } : null;
  }

  /** 그림 생성 (PNG). 키가 없거나 실패하면 null */
  async generateImage(prompt: string): Promise<Buffer | null> {
    if (!this.imageEnabled) return null;
    try {
      const res = await fetch(`${base()}/images/generations`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.IMAGE_API_KEY}` },
        body: JSON.stringify({ model: process.env.IMAGE_MODEL ?? 'gpt-image-1', prompt, size: '1024x1024', n: 1 }),
        signal: AbortSignal.timeout(IMAGE_TIMEOUT),
      });
      if (!res.ok) return this.fail('image', res.status), null;
      return this.firstImage((await res.json()) as ImageResponse);
    } catch (e) {
      return this.fail('image', (e as Error).message), null;
    }
  }

  /** 사진 변환 (스타일 지시를 적용한 새 PNG). 원본은 업로드된 이미지여야 함 */
  async editImage(source: Buffer, mime: string, prompt: string): Promise<Buffer | null> {
    if (!this.imageEnabled) return null;
    try {
      const form = new FormData();
      form.append('model', process.env.IMAGE_MODEL ?? 'gpt-image-1');
      form.append('prompt', prompt);
      form.append('size', '1024x1024');
      form.append('image', new Blob([new Uint8Array(source)], { type: mime }), 'source.' + (mime.split('/')[1] ?? 'png'));
      const res = await fetch(`${base()}/images/edits`, {
        method: 'POST',
        headers: { authorization: `Bearer ${process.env.IMAGE_API_KEY}` },
        body: form,
        signal: AbortSignal.timeout(IMAGE_TIMEOUT),
      });
      if (!res.ok) return this.fail('edit', res.status), null;
      return this.firstImage((await res.json()) as ImageResponse);
    } catch (e) {
      return this.fail('edit', (e as Error).message), null;
    }
  }

  private async imagePayload(mediaUrl: string) {
    const parsed = parseUploadUrl(mediaUrl);
    const mime = parsed ? MIME[parsed.ext] : undefined;
    if (!mime) return null;
    try {
      return { mime, data: (await readUploadBuffer(mediaUrl)).toString('base64') };
    } catch {
      return null;
    }
  }

  private async anthropic(body: Record<string, unknown>): Promise<string | null> {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY ?? '', 'anthropic-version': '2023-06-01' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TEXT_TIMEOUT),
      });
      if (!res.ok) return this.fail('text', res.status), null;
      const data = (await res.json()) as { content?: { type: string; text?: string }[] };
      const out = (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('').trim();
      return out || null;
    } catch (e) {
      return this.fail('text', (e as Error).message), null;
    }
  }

  private async firstImage(data: ImageResponse): Promise<Buffer | null> {
    const item = data.data?.[0];
    if (item?.b64_json) return Buffer.from(item.b64_json, 'base64');
    if (item?.url) {
      const img = await fetch(item.url, { signal: AbortSignal.timeout(IMAGE_TIMEOUT) });
      return img.ok ? Buffer.from(await img.arrayBuffer()) : null;
    }
    return null;
  }

  private fail(kind: string, detail: unknown) {
    this.log.warn(`AI ${kind} 호출 실패: ${String(detail)}`);
  }
}

type ImageResponse = { data?: { b64_json?: string; url?: string }[] };
const base = () => (process.env.IMAGE_API_URL ?? '').replace(/\/$/, '');

@Global()
@Module({ providers: [AiService], exports: [AiService] })
export class AiModule { }
