import { Injectable } from '@nestjs/common';

export const CLOCK = Symbol('Clock');

/** Fonte do "agora". Injetavel para que regras com tempo sejam testaveis. */
export interface Clock {
  now(): Date;
}

@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
