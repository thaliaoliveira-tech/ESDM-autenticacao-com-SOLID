import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { aiConfig } from './config/ai.config';
import { appConfig } from './config/app.config';
import { authConfig } from './config/auth.config';
import { databaseConfig } from './config/database.config';
import { validateEnvironment } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { HealthController } from './health/health.controller';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/infrastructure/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SpacesModule } from './modules/spaces/spaces.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';
import { RequestContextMiddleware } from './shared/http/request-context';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig, aiConfig],
      validate: validateEnvironment,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
    }),
    // Registra o SchedulerRegistry; os jobs decidem na subida se agendam (JOBS_ENABLED).
    ScheduleModule.forRoot(),
    SharedModule,
    PrismaModule,
    AuditModule,
    UsersModule,
    AuthModule,
    SettingsModule,
    SpacesModule,
    TasksModule,
    ConversationsModule,
    ChatModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*path');
  }
}
