import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { pageRequest, PaginationQueryDto } from '../../../shared/pagination';
import type { AuthenticatedUser } from '../../auth/domain/entities/auth-session';
import { JwtAuthGuard } from '../../auth/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { NotificationsService } from '../application/notifications.service';

/**
 * Avisos dentro do app. O frontend consulta `GET /notifications` a cada
 * intervalo; a consulta gera o lembrete do dia se ja venceu e devolve as nao
 * lidas. Ler (uma ou todas) tira da lista.
 */
@ApiExcludeController()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationQueryDto) {
    return this.notifications.list(user.userId, pageRequest(query));
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async readAll(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.notifications.markAllRead(user.userId);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async read(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.notifications.markRead(user.userId, id);
  }
}
