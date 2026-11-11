import { Global, Module } from '@nestjs/common';
import { CLOCK, SystemClock } from './domain/clock';

/** Servicos transversais disponiveis em todos os modulos. */
@Global()
@Module({
  providers: [{ provide: CLOCK, useClass: SystemClock }],
  exports: [CLOCK],
})
export class SharedModule {}
