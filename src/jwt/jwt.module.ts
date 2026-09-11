// src/jwt/jwt.module.ts
import { Global, Module } from '@nestjs/common';
import { JwtKeysService } from './jwt-keys.service';
import { TokenService } from './jwt.service';
import { JwksController } from './jwks.controller';

@Global() // así cualquier módulo puede inyectar TokenService sin re-importar
@Module({
  controllers: [JwksController],
  providers: [JwtKeysService, TokenService],
  exports: [TokenService],
})
export class JwtModule {}