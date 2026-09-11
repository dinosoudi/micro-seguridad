// src/jwt/jwt-keys.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtKeysService {
  readonly privateKey: string;
  readonly publicKey: string;
  readonly kid: string;

  constructor(private config: ConfigService) {
    this.privateKey = Buffer.from(
      this.config.getOrThrow<string>('JWT_PRIVATE_KEY'),
      'base64',
    ).toString('utf-8');

    this.publicKey = Buffer.from(
      this.config.getOrThrow<string>('JWT_PUBLIC_KEY'),
      'base64',
    ).toString('utf-8');

    this.kid = this.config.getOrThrow<string>('JWT_KID');
  }
}