import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { pageRequest } from '../../../shared/pagination';
import type { AuthenticatedUser } from '../../auth/domain/entities/auth-session';
import { JwtAuthGuard } from '../../auth/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { TasksService } from '../application/tasks.service';
import {
  CompleteTaskDto,
  CreateTaskDto,
  ListTasksQueryDto,
  TodayQueryDto,
  UpdateTaskDto,
} from './tasks.dto';

/** Telas Hoje, Tarefas (Hoje/Amanha/Esta semana/Todas) e Detalhes da tarefa. */
@ApiExcludeController()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListTasksQueryDto) {
    return this.tasks.list(user.userId, {
      status: query.status ?? 'all',
      period: query.period ?? 'all',
      spaceId: query.spaceId,
      query: query.q,
      sort: query.sort ?? 'created',
      today: query.today,
      page: pageRequest(query),
    });
  }

  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser, @Query() query: TodayQueryDto) {
    return this.tasks.summary(user.userId, query.today);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tasks.get(user.userId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTaskDto) {
    return this.tasks.create(user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(user.userId, id, dto);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CompleteTaskDto,
  ) {
    return this.tasks.complete(user.userId, id, dto.completedOn);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  reopen(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tasks.reopen(user.userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.tasks.delete(user.userId, id);
  }
}
