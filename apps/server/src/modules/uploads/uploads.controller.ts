import { Controller, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GroupMemberGuard } from '../../common/group-member.guard';
import { MasterGuard } from '../../common/master.guard';
import { FeatureSettingsService } from '../features/feature-settings.service';
import { maxUploadBytes, UploadedFileLike, UploadsService } from './uploads.service';

/** 사진·영상 업로드 (그룹 구성원). 사진/영상 미션 등에서 사용 */
@UseGuards(GroupMemberGuard)
@Controller('groups/:groupId/uploads')
export class UploadsController {
  constructor(
    private readonly uploads: UploadsService,
    private readonly settings: FeatureSettingsService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: maxUploadBytes() } }))
  async upload(@Param('groupId') groupId: string, @UploadedFile() file: UploadedFileLike | undefined) {
    const mission = await this.settings.get(groupId, 'PHOTO_MISSION');
    return this.uploads.save(file, mission.allowVideo !== false);
  }
}

/** MASTER 업로드 (기능 소개 이미지 등, 사진만) */
@UseGuards(MasterGuard)
@Controller('admin/uploads')
export class AdminUploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: maxUploadBytes() } }))
  upload(@UploadedFile() file: UploadedFileLike | undefined) {
    return this.uploads.save(file, false);
  }
}
