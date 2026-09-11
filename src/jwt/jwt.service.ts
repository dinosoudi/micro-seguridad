// src/jwt/jwt.service.ts (wrapper propio, no confundir con @nestjs/jwt)
import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { JwtKeysService } from './jwt-keys.service';

interface AccessTokenPayload {
  sub: string;       // userId
  email: string;
  roles?: string[];  // preparado a futuro, opcional por ahora
}

@Injectable()
export class TokenService {
  constructor(private keys: JwtKeysService) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, this.keys.privateKey, {
      algorithm: 'RS256',
      expiresIn: '15m',
      keyid: this.keys.kid, // esto pone el "kid" en el header del JWT
      issuer: 'auth-service',
    });
  }

  signRefreshToken(userId: string, tokenVersion: number): string {
    return jwt.sign({ sub: userId, tokenVersion }, this.keys.privateKey, {
      algorithm: 'RS256',
      expiresIn: '7d',
      keyid: this.keys.kid,
      issuer: 'auth-service',
    });
  }

  verifyRefreshToken(token: string) {
    return jwt.verify(token, this.keys.publicKey, {
      algorithms: ['RS256'],
    });
  }
}