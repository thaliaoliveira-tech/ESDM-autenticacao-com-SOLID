import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConversationsModule } from '../conversations/conversations.module';
import { SettingsModule } from '../settings/settings.module';
import { SpacesModule } from '../spaces/spaces.module';
import { TasksModule } from '../tasks/tasks.module';
import { ChatService } from './application/chat.service';
import { ProposalsService } from './application/proposals.service';
import { AI_PROVIDER } from './domain/ai-provider';
import { CHAT_REPOSITORY } from './domain/chat';
import { OpenRouterProvider } from './infrastructure/openrouter.provider';
import { PrismaChatRepository } from './infrastructure/prisma-chat.repository';
import { ChatController } from './presentation/chat.controller';

@Module({
  imports: [ConversationsModule, TasksModule, SpacesModule, SettingsModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    ProposalsService,
    { provide: CHAT_REPOSITORY, useClass: PrismaChatRepository },
    {
      provide: AI_PROVIDER,
      useFactory: (config: ConfigService) => new OpenRouterProvider(config),
      inject: [ConfigService],
    },
  ],
})
export class ChatModule {}
