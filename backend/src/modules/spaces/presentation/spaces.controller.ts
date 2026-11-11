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
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { pageRequest, PaginationQueryDto } from '../../../shared/pagination';
import { Trim } from '../../../shared/http/validation';
import type { AuthenticatedUser } from '../../auth/domain/entities/auth-session';
import { JwtAuthGuard } from '../../auth/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { SpacesService } from '../application/spaces.service';
import { SPACE_NAME_MAX } from '../domain/space';

export class SpaceNameDto {
  @Trim()
  @IsString({ message: 'name deve ser uma string.' })
  @MaxLength(SPACE_NAME_MAX, {
    message: `O nome do espaco deve ter no maximo ${SPACE_NAME_MAX} caracteres.`,
  })
  name!: string;
}

export class ListSpacesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString({ message: 'q deve ser uma string.' })
  @MaxLength(200, { message: 'q deve ter no maximo 200 caracteres.' })
  q?: string;
}

/** Tela Espacos: categorias que agrupam as tarefas. */
@ApiExcludeController()
@UseGuards(JwtAuthGuard)
@Controller('spaces')
export class SpacesController {
  constructor(private readonly spaces: SpacesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListSpacesQueryDto) {
    return this.spaces.list(user.userId, query.q, pageRequest(query));
  }

  @Get('suggestions')
  async suggestions(@CurrentUser() user: AuthenticatedUser) {
    return { data: await this.spaces.suggestions(user.userId) };
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.spaces.get(user.userId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: SpaceNameDto) {
    return this.spaces.create(user.userId, dto.name);
  }

  @Patch(':id')
  rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SpaceNameDto,
  ) {
    return this.spaces.rename(user.userId, id, dto.name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.spaces.delete(user.userId, id);
  }
}
