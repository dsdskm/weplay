import { z } from 'zod';

export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_SIZE = 1024 * 1024 * 1024;
export const attachmentSchema = z.object({
    url: z.string().regex(/^\/uploads\/(?:terms\/(?:private-policy|terms-of-service)\/)?[a-f0-9]{32}\.(?:jpg|jpeg|png|gif|webp|mp4|webm|mov|pdf|txt|html|htm|csv|doc|docx|xls|xlsx|ppt|pptx|hwp|hwpx|zip)$/),
    name: z.string().trim().min(1).max(255).regex(/^[^\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069/\\]+$/),
    size: z.number().int().positive().max(MAX_ATTACHMENT_SIZE),
    mimeType: z.string().min(1).max(127).regex(/^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/),
    mediaType: z.enum(['IMAGE', 'VIDEO', 'FILE']),
}).superRefine((attachment, context) => {
    const extension = attachment.url.split('.').pop();
    const image = /^(jpg|jpeg|png|gif|webp)$/.test(extension ?? '');
    const video = /^(mp4|webm|mov)$/.test(extension ?? '');
    if ((attachment.mediaType === 'IMAGE' && (!image || !attachment.mimeType.startsWith('image/'))) ||
        (attachment.mediaType === 'VIDEO' && (!video || !attachment.mimeType.startsWith('video/'))) ||
        (attachment.mediaType === 'FILE' && (image || video)) ||
        (/^(html|htm)$/.test(extension ?? '') && attachment.mimeType !== 'text/html')) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid attachment media type' });
    }
});
export type Attachment = z.infer<typeof attachmentSchema>;
export const attachmentsSchema = z.array(attachmentSchema).max(MAX_ATTACHMENTS);
export const attachmentInputSchema = z.object({ attachments: attachmentsSchema.optional() });

export function attachmentSizeLimit(maxMegabytes: unknown = 30) {
    const megabytes = Number(maxMegabytes);
    return Math.min(Number.isFinite(megabytes) && megabytes > 0 ? megabytes * 1024 * 1024 : 30 * 1024 * 1024, MAX_ATTACHMENT_SIZE);
}

export function createAttachmentInputSchema(maxBytes: number) {
    return z.object({ attachments: attachmentsSchema.refine((items) => items.every((item) => item.size <= maxBytes), '첨부 파일 크기 제한을 초과했어요').optional() });
}

export function readAttachments(value: unknown): Attachment[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
        const parsed = attachmentSchema.safeParse(item);
        return parsed.success ? [parsed.data] : [];
    }).slice(0, MAX_ATTACHMENTS);
}