import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { TASK_PERIODS, type TaskPeriod } from '../../../shared/domain/dates';
import { EmptyToNull, IsIsoDate, Trim } from '../../../shared/http/validation';
import { PaginationQueryDto } from '../../../shared/pagination';
import { SPACE_NAME_MAX } from '../../spaces/domain/space';
import {
  ASSIGNEE_MAX,
  DESCRIPTION_MAX,
  PRIORITY_VALUES,
  TASK_SORTS,
  TITLE_MAX,
  type Priority,
  type TaskSort,
} from '../domain/task';
import type { StatusFilter } from '../application/tasks.service';

const keepNull = (value: unknown) => value !== null;

/** Campos comuns a criacao e edicao (formulario "Nova tarefa"/"Editar tarefa"). */
class TaskFieldsDto {
  @IsOptional()
  @ValidateIf(keepNull)
  @Trim()
  @IsString({ message: 'description deve ser uma string.' })
  @MaxLength(DESCRIPTION_MAX, {
    message: `Use uma descricao de ate ${DESCRIPTION_MAX} caracteres.`,
  })
  description?: string | null;

  @IsOptional()
  @ValidateIf(keepNull)
  @Trim()
  @IsString({ message: 'assignee deve ser uma string.' })
  @MaxLength(ASSIGNEE_MAX, { message: `Use um responsavel de ate ${ASSIGNEE_MAX} caracteres.` })
  assignee?: string | null;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf(keepNull)
  @IsIsoDate({ message: 'Use uma data de prazo valida (AAAA-MM-DD).' })
  dueOn?: string | null;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf(keepNull)
  @IsIn(PRIORITY_VALUES, { message: 'priority deve ser high, medium, low ou null.' })
  priority?: Priority | null;

  @IsOptional()
  @EmptyToNull()
  @ValidateIf(keepNull)
  @IsString({ message: 'spaceId deve ser uma string.' })
  spaceId?: string | null;

  @IsOptional()
  @ValidateIf(keepNull)
  @Trim()
  @IsString({ message: 'spaceName deve ser uma string.' })
  @MaxLength(SPACE_NAME_MAX, {
    message: `O nome do espaco deve ter no maximo ${SPACE_NAME_MAX} caracteres.`,
  })
  spaceName?: string | null;
}

export class CreateTaskDto extends TaskFieldsDto {
  @Trim()
  @IsString({ message: 'title deve ser uma string.' })
  @IsNotEmpty({ message: 'Informe o titulo da tarefa.' })
  @MaxLength(TITLE_MAX, { message: `Use um titulo de ate ${TITLE_MAX} caracteres.` })
  title!: string;
}

export class UpdateTaskDto extends TaskFieldsDto {
  @IsOptional()
  @Trim()
  @IsString({ message: 'title deve ser uma string.' })
  @IsNotEmpty({ message: 'Informe o titulo da tarefa.' })
  @MaxLength(TITLE_MAX, { message: `Use um titulo de ate ${TITLE_MAX} caracteres.` })
  title?: string;
}

export class CompleteTaskDto {
  @IsOptional()
  @EmptyToNull()
  @ValidateIf(keepNull)
  @IsIsoDate({ message: 'Use uma data de conclusao valida (AAAA-MM-DD).' })
  completedOn?: string | null;
}

export class TodayQueryDto {
  @IsOptional()
  @IsIsoDate({ message: 'today deve ser uma data valida no formato AAAA-MM-DD.' })
  today?: string;
}

export class ListTasksQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['pending', 'done', 'all'], { message: 'status deve ser pending, done ou all.' })
  status?: StatusFilter;

  @IsOptional()
  @IsIn(TASK_PERIODS, { message: 'period deve ser today, tomorrow, week ou all.' })
  period?: TaskPeriod;

  /** Id do espaco ou `none` para tarefas sem espaco. */
  @IsOptional()
  @IsString({ message: 'spaceId deve ser uma string.' })
  spaceId?: string;

  @IsOptional()
  @IsString({ message: 'q deve ser uma string.' })
  @MaxLength(200, { message: 'q deve ter no maximo 200 caracteres.' })
  q?: string;

  @IsOptional()
  @IsIn(TASK_SORTS, { message: 'sort deve ser created, due ou priority.' })
  sort?: TaskSort;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === '' ? undefined : value))
  @IsIsoDate({ message: 'today deve ser uma data valida no formato AAAA-MM-DD.' })
  today?: string;
}
