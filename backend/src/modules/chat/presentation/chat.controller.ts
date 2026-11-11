import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { toErrorBody } from '../../../shared/errors/application-error.filter';
import { currentRequestId } from '../../../shared/http/request-context';
import type { AuthenticatedUser } from '../../auth/domain/entities/auth-session';
import { JwtAuthGuard } from '../../auth/infrastructure/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { ChatService, type ChatEvent } from '../application/chat.service';
import type { ChatMessageView } from '../application/chat.views';
import { ProposalsService } from '../application/proposals.service';
import {
  AnalysisDto,
  AskDto,
  ProposalEditsDto,
  StreamQueryDto,
  ThreadDto,
  ThreadQueryDto,
} from './chat.dto';

type EventSource = (signal: AbortSignal) => AsyncGenerator<ChatEvent>;

/** Resposta JSON (sem streaming) das rotas que geram respostas da IA. */
export interface ChatExchange {
  userMessage: ChatMessageView | null;
  assistantMessage: ChatMessageView | null;
}

/**
 * Chat com IA e propostas de tarefas.
 *
 * Rotas que geram resposta aceitam dois modos:
 *  - streaming (SSE) com `Accept: text/event-stream` ou `?stream=true`:
 *    eventos `user_message`, `delta`, `assistant_message`, `error` e `done`;
 *  - JSON ao final (padrao), para clientes sem leitura de streaming.
 * Fechar a conexao interrompe a resposta; o trecho recebido e salvo.
 */
@ApiExcludeController()
@UseGuards(JwtAuthGuard)
@Controller()
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly proposals: ProposalsService,
  ) {}

  @Get('ai/status')
  status() {
    return this.chat.status();
  }

  @Get('chat/messages')
  async messages(@CurrentUser() user: AuthenticatedUser, @Query() query: ThreadQueryDto) {
    return { data: await this.chat.listMessages(user.userId, query.conversationId ?? null) };
  }

  @Get('chat/suggestions')
  async suggestions(@CurrentUser() user: AuthenticatedUser, @Query() query: ThreadQueryDto) {
    return { data: await this.chat.suggestions(user.userId, query.conversationId ?? null) };
  }

  @Post('chat/messages')
  ask(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AskDto,
    @Query() query: StreamQueryDto,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    return this.respond(request, response, query, (signal) =>
      this.chat.ask(user.userId, dto.conversationId ?? null, dto.content, signal),
    );
  }

  @Post('chat/retry')
  retry(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ThreadDto,
    @Query() query: StreamQueryDto,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    return this.respond(request, response, query, (signal) =>
      this.chat.retry(user.userId, dto.conversationId ?? null, signal),
    );
  }

  @Post('chat/analysis')
  analysis(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AnalysisDto,
    @Query() query: StreamQueryDto,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    return this.respond(request, response, query, (signal) =>
      this.chat.analyze(user.userId, dto.conversationId, signal),
    );
  }

  @Post('chat/proposals/:id/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() edits: ProposalEditsDto,
  ) {
    const hasEdits = Object.values(edits).some((value) => value !== undefined);
    return this.proposals.confirm(user.userId, id, hasEdits ? edits : undefined);
  }

  @Post('chat/proposals/:id/discard')
  @HttpCode(HttpStatus.OK)
  discard(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.proposals.discard(user.userId, id);
  }

  @Post('chat/messages/:id/proposals/confirm-all')
  @HttpCode(HttpStatus.OK)
  confirmAll(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.proposals.confirmAll(user.userId, id);
  }

  private async respond(
    request: Request,
    response: Response,
    query: StreamQueryDto,
    source: EventSource,
  ): Promise<void> {
    const abort = new AbortController();
    response.on('close', () => {
      if (!response.writableFinished) {
        abort.abort();
      }
    });
    const events = source(abort.signal);
    const wantsStream =
      query.stream ?? (request.headers.accept ?? '').includes('text/event-stream');

    if (!wantsStream) {
      const exchange: ChatExchange = { userMessage: null, assistantMessage: null };
      for await (const event of events) {
        if (event.type === 'user_message') exchange.userMessage = event.message;
        if (event.type === 'assistant_message') exchange.assistantMessage = event.message;
      }
      if (!response.writableEnded && !abort.signal.aborted) {
        response.status(HttpStatus.CREATED).json(exchange);
      }
      return;
    }

    // O primeiro evento e lido antes dos cabecalhos: erros de validacao, conversa
    // inexistente ou IA nao configurada mantem o status HTTP correto.
    const first = await events.next();
    response.status(HttpStatus.OK);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();

    const send = (type: string, payload: object) => {
      if (!response.writableEnded) {
        response.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...payload })}\n\n`);
      }
    };

    try {
      for (let result = first; !result.done; result = await events.next()) {
        const { type, ...payload } = result.value;
        send(type, payload);
      }
      send('done', {});
    } catch (error) {
      const body = toErrorBody(error);
      send('error', { ...body, requestId: currentRequestId() });
    } finally {
      response.end();
    }
  }
}
