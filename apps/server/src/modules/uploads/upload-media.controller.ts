import { Controller, Get, Head, HttpStatus, Param, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { pipeline } from 'stream/promises';
import { Public } from '../../common/decorators';
import { isUploadMissing, logStorageError, openUpload, parseUploadName } from './upload-storage';

@Public()
@Controller('uploads')
export class UploadMediaController {
    @Head(':name')
    head(@Param('name') name: string, @Req() req: Request, @Res() res: Response) {
        return this.serve(name, req, res);
    }

    @Get(':name')
    async serve(@Param('name') name: string, @Req() req: Request, @Res() res: Response) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        const parsed = parseUploadName(name);
        if (!parsed) return res.sendStatus(HttpStatus.NOT_FOUND);
        if (parsed.ext === 'html' || parsed.ext === 'htm') {
            res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
        }
        try {
            const source = await openUpload(name);
            res.setHeader('Content-Type', parsed.mimeType);
            res.setHeader('Content-Disposition', `${parsed.mediaType === 'FILE' ? 'attachment' : 'inline'}; filename="${name}"`);
            res.setHeader('Cache-Control', 'private, max-age=3600');
            res.setHeader('Accept-Ranges', 'bytes');
            let range: { start: number; end: number } | undefined;
            if (req.headers.range && req.method !== 'HEAD') {
                const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
                const start = match?.[1] ? Number(match[1]) : Math.max(0, source.size - Number(match?.[2]));
                const end = match?.[1] && match[2] ? Math.min(Number(match[2]), source.size - 1) : source.size - 1;
                if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= source.size) {
                    res.setHeader('Content-Range', `bytes */${source.size}`);
                    return res.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE).end();
                }
                range = { start, end };
                res.status(HttpStatus.PARTIAL_CONTENT);
                res.setHeader('Content-Range', `bytes ${start}-${end}/${source.size}`);
            }
            res.setHeader('Content-Length', range ? range.end - range.start + 1 : source.size);
            if (req.method === 'HEAD') return res.end();
            await pipeline(source.stream(range), res);
        } catch (error) {
            if (!isUploadMissing(error)) logStorageError('read', error);
            if (res.headersSent || res.destroyed) {
                res.destroy();
                return;
            }
            res.removeHeader('Content-Length');
            res.removeHeader('Content-Type');
            res.removeHeader('Content-Disposition');
            res.removeHeader('Content-Range');
            res.setHeader('Cache-Control', 'no-store');
            return res.status(isUploadMissing(error) ? HttpStatus.NOT_FOUND : HttpStatus.SERVICE_UNAVAILABLE).json({ message: isUploadMissing(error) ? '파일을 찾을 수 없어요' : '파일을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' });
        }
    }
}