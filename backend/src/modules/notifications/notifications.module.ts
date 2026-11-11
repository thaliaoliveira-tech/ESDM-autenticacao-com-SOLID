import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { TasksModule } from '../tasks/tasks.module';
import { DailyReminderService } from './application/daily-reminder.service';
import { NotificationsService } from './application/notifications.service';
import { NOTIFICATION_REPOSITORY } from './domain/notification';
import { PrismaNotificationRepository } from './infrastructure/prisma-notification.repository';
import { NotificationsController } from './presentation/notifications.controller';

@Module({
  imports: [SettingsModule, TasksModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    DailyReminderService,
    { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
  ],
})
export class NotificationsModule {}
