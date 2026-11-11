import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Injectable,
  Param,
  Patch,
  PayloadTooLargeException,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiExcludeController } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import { PayloadTooLargeError } from '../../../shared/errors/application-error';
import { Trim } from '../../../shared/http/validation';
import { pageRequest, PaginationQueryDto } from '../../../shared/pagination';
import type { AuthenticatedUser } from '../../auth/domain/entities/auth-session';
import { JwtAuthGuard } from '../../auth/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { ConversationsService, type ImportResult } from '../application/conversations.service';
import { FILE_NAME_MAX, MAX_FILE_BYTES } from '../domain/conversation';

export class ListConversationsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString({ message: 'q deve ser uma string.' })
  @MaxLength(200, { message: 'q deve ter no maximo 200 caracteres.' })
  q?: string;
}

export class RenameConversationDto {
  @Trim()
  @IsString({ message: 'fileName deve ser uma string.' })
  @MaxLength(FILE_NAME_MAX, { message: `Informe um nome de ate ${FILE_NAME_MAX} caracteres.` })
  fileName!: string;
}

const UploadInterceptor = FileInterceptor('file', {
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
});

/** Traduz o limite do multer para a mensagem do prototipo. */
@Injectable()
export class ConversationUploadInterceptor extends UploadInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    try {
      // O multer processa o upload antes de devolver o Observable: o erro de limite surge aqui.
      return await super.intercept(context, next);
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw new PayloadTooLargeError('Use um arquivo de ate 10 MB.');
      }
      throw error;
    }
  }
}

/** Conversas: importacao, historico ("Conversas salvas") e detalhes. */
@ApiExcludeController()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListConversationsQueryDto) {
    return this.conversations.list(user.userId, query.q, pageRequest(query));
  }

  /** multipart/form-data com o campo `file` (.txt exportado do WhatsApp). */
  @Post()
  @UseInterceptors(ConversationUploadInterceptor)
  async import(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ImportResult> {
    const result = await this.conversations.import(
      user.userId,
      file && { originalName: decodeName(file.originalname), size: file.size, buffer: file.buffer },
    );
    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return result;
  }

  /** "Usar um exemplo". */
  @Post('sample')
  async importSample(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ImportResult> {
    const result = await this.conversations.importSample(user.userId);
    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return result;
  }

  @Get(':id')
  details(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.conversations.details(user.userId, id);
  }

  /** Texto original importado. */
  @Get(':id/content')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async content(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<string> {
    return (await this.conversations.content(user.userId, id)).content;
  }

  @Patch(':id')
  rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RenameConversationDto,
  ) {
    return this.conversations.rename(user.userId, id, dto.fileName);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await this.conversations.delete(user.userId, id);
  }
}

/**
 * O multer entrega o nome do arquivo como latin1; navegadores e apps enviam
 * UTF-8. Reinterpreta quando o resultado e UTF-8 valido ("Conversa do WhatsApp").
 */
export function decodeName(name: string): string {
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? name : decoded;
}
