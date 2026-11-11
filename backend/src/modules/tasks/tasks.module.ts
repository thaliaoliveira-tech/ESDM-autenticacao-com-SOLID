import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { SpacesModule } from '../spaces/spaces.module';
import { TasksService } from './application/tasks.service';
import { TASK_REPOSITORY } from './domain/task';
import { PrismaTaskRepository } from './infrastructure/prisma-task.repository';
import { TasksController } from './presentation/tasks.controller';

@Module({
  imports: [SpacesModule, SettingsModule],
  controllers: [TasksController],
  providers: [TasksService, { provide: TASK_REPOSITORY, useClass: PrismaTaskRepository }],
  exports: [TasksService],
})
export class TasksModule {}
