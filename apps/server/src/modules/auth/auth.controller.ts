import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ChangePasswordInput,
  changePasswordSchema,
  GoogleLoginInput,
  googleLoginSchema,
  MasterLoginInput,
  masterLoginSchema,
} from '@weplay/shared';
import { AuthUser, CurrentUser, Public } from '../../common/decorators';
import { MasterGuard } from '../../common/master.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Get('config')
  config() {
    return { googleEnabled: !!process.env.GOOGLE_CLIENT_ID };
  }

  @Public()
  @Post('google')
  google(@Body(new ZodPipe(googleLoginSchema)) body: GoogleLoginInput) {
    return this.auth.loginWithGoogle(body.credential);
  }

  @Public()
  @Post('master/login')
  masterLogin(@Body(new ZodPipe(masterLoginSchema)) body: MasterLoginInput) {
    return this.auth.masterLogin(body);
  }

  @UseGuards(MasterGuard)
  @Post('master/change-password')
  changePassword(@CurrentUser() user: AuthUser, @Body(new ZodPipe(changePasswordSchema)) body: ChangePasswordInput) {
    return this.auth.changePassword(user.id, body);
  }
}
