import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { EmptyToNull, IsIsoDate, Trim } from '../../../shared/http/validation';
import { SPACE_NAME_MAX } from '../../spaces/domain/space';
import {
  ASSIGNEE_MAX,
  DESCRIPTION_MAX,
  PRIORITY_VALUES,
  TITLE_MAX,
  type Priority,
} from '../../tasks/domain/task';
import { QUESTION_MAX } from '../application/chat.service';

const keepNull = (value: unknown) => value !== null;
const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1'
    ? true
    : value === false || value === 'false' || value === '0'
      ? false
      : value;

/** Conversa alvo; ausente = conversa geral do usuario. */
export class ThreadDto {
  @IsOptional()
  @EmptyToNull()
  @ValidateIf(keepNull)
  @IsString({ message: 'conversationId deve ser uma string.' })
  conversationId?: string | null;
}

export class ThreadQueryDto extends ThreadDto {}

export class AskDto extends ThreadDto {
  @Trim()
  @IsString({ message: 'content deve ser uma string.' })
  @IsNotEmpty({ message: 'Envie uma pergunta.' })
  @MaxLength(QUESTION_MAX, { message: `Envie uma pergunta de ate ${QUESTION_MAX} caracteres.` })
  content!: string;
}

export class AnalysisDto {
  @IsString({ message: 'conversationId deve ser uma string.' })
  @IsNotEmpty({ message: 'Importe uma conversa para gerar a analise.' })
  conversationId!: string;
}

/** `?stream=false` devolve JSON ao final, para clientes sem leitura de streaming. */
export class StreamQueryDto {
  @IsOptional()
  @Transform(toBoolean)
  @IsIn([true, false], { message: 'stream deve ser true ou false.' })
  stream?: boolean;
}

/** Valores ajustados em "Editar" antes de confirmar uma proposta. */
export class ProposalEditsDto {
  @IsOptional()
  @Trim()
  @IsString({ message: 'title deve ser uma string.' })
  @IsNotEmpty({ message: 'Informe o titulo da tarefa.' })
  @MaxLength(TITLE_MAX, { message: `Use um titulo de ate ${TITLE_MAX} caracteres.` })
  title?: string;

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

  @IsOptional()
  @EmptyToNull()
  @ValidateIf(keepNull)
  @IsIsoDate({ message: 'Use uma data de conclusao valida (AAAA-MM-DD).' })
  completedOn?: string | null;
}
