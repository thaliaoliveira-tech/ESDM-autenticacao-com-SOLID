import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/domain/entities/auth-session';
import { pageRequest, PaginationQueryDto } from '../../../shared/pagination';
import { AuditService } from '../application/audit.service';

/** GET /account/activity - historico de operacoes do proprio usuario. */
@ApiExcludeController()
@UseGuards(JwtAuthGuard)
@Controller('account/activity')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.audit.listForUser(user.userId, pageRequest(query));
  }
}
