import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ChangePasswordInput,
  changePasswordSchema,
  DeactivateInput,
  deactivateSchema,
  GoogleLoginInput,
  googleLoginSchema,
  LocalLoginInput,
  localLoginSchema,
  MasterLoginInput,
  masterLoginSchema,
  PasswordResetRequestInput,
  passwordResetRequestSchema,
  SignupInput,
  signupSchema,
} from '@weplay/shared';
import { AuthUser, CurrentUser, Public } from '../../common/decorators';
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

  @Public()
  @Post('login')
  login(@Body(new ZodPipe(localLoginSchema)) body: LocalLoginInput) {
    return this.auth.localLogin(body);
  }

  @Public()
  @Post('signup')
  signup(@Body(new ZodPipe(signupSchema)) body: SignupInput) {
    return this.auth.signup(body);
  }

  @Public()
  @Post('password-reset')
  passwordReset(@Body(new ZodPipe(passwordResetRequestSchema)) body: PasswordResetRequestInput) {
    return this.auth.requestPasswordReset(body.email);
  }

  @Post('change-password')
  changePassword(@CurrentUser() user: AuthUser, @Body(new ZodPipe(changePasswordSchema)) body: ChangePasswordInput) {
    return this.auth.changePassword(user.id, body);
  }

  @Post('deactivate')
  deactivate(@CurrentUser() user: AuthUser, @Body(new ZodPipe(deactivateSchema)) body: DeactivateInput) {
    return this.auth.deactivate(user.id, body);
  }
}
