import { Module } from '@nestjs/common';
import { AdminTermsController, MyTermsController, TermsController } from './terms.controller';
import { TermsService } from './terms.service';
import { TermsMailService } from './terms-mail.service';

@Module({ controllers: [TermsController, MyTermsController, AdminTermsController], providers: [TermsService, TermsMailService] })
export class TermsModule { }
