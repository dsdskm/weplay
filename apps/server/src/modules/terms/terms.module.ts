import { Module } from '@nestjs/common';
import { AdminTermsController, MyTermsController, TermsController } from './terms.controller';
import { TermsService } from './terms.service';

@Module({ controllers: [TermsController, MyTermsController, AdminTermsController], providers: [TermsService] })
export class TermsModule {}
