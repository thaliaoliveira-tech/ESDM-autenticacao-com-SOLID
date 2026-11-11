import { Module } from '@nestjs/common';
import { SpacesService } from './application/spaces.service';
import { SPACE_REPOSITORY } from './domain/space';
import { PrismaSpaceRepository } from './infrastructure/prisma-space.repository';
import { SpacesController } from './presentation/spaces.controller';

@Module({
  controllers: [SpacesController],
  providers: [SpacesService, { provide: SPACE_REPOSITORY, useClass: PrismaSpaceRepository }],
  exports: [SpacesService],
})
export class SpacesModule {}
