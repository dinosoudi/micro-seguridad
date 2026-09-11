// src/jwt/jwks.controller.ts
import { Controller, Get } from '@nestjs/common';
import { createPublicKey } from 'crypto';
import { JwtKeysService } from './jwt-keys.service';

@Controller('.well-known')
export class JwksController {
  constructor(private keys: JwtKeysService) {}

  @Get('jwks.json')
  getJwks() {
    const keyObject = createPublicKey(this.keys.publicKey);
    const jwk = keyObject.export({ format: 'jwk' });

    return {
      keys: [
        {
          ...jwk,
          use: 'sig',
          alg: 'RS256',
          kid: this.keys.kid,
        },
      ],
    };
  }
}