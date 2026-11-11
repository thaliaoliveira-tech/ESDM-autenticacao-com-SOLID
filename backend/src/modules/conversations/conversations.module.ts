import { Module } from '@nestjs/common';
import { ConversationsService } from './application/conversations.service';
import { CONVERSATION_REPOSITORY } from './domain/conversation';
import { PrismaConversationRepository } from './infrastructure/prisma-conversation.repository';
import { ConversationsController } from './presentation/conversations.controller';

@Module({
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    { provide: CONVERSATION_REPOSITORY, useClass: PrismaConversationRepository },
  ],
  exports: [ConversationsService],
})
export class ConversationsModule {}
