import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { SecureTokenGenerator } from '../../domain/contracts/secure-token';

const TOKEN_FORMAT = /^[a-f0-9]{64}$/;

/** 32 bytes aleatorios em hexadecimal; SHA-256 para armazenamento. */
@Injectable()
export class CryptoSecureTokenGenerator implements SecureTokenGenerator {
  generate(): string {
    return randomBytes(32).toString('hex');
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  isWellFormed(token: string): boolean {
    return typeof token === 'string' && TOKEN_FORMAT.test(token);
  }
}
