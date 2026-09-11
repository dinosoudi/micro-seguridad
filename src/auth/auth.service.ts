// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { TokenService } from '../jwt/jwt.service';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private tokens: TokenService,
  ) {}

  async register(email: string, password: string) {
    const existing = await this.users.findByEmail(email);
    if (existing) throw new ConflictException('El correo ya está registrado');

    const hash = await bcrypt.hash(password, 12);
    const user = await this.users.create(email, hash);

    return this.issueTokens(user);
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.tokens.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const user = await this.users.findById(payload.sub);
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Refresh token revocado');
    }

    return this.issueTokens(user);
  }

  private issueTokens(user: { id: string; email: string; tokenVersion: number }) {
    return {
      accessToken: this.tokens.signAccessToken({ sub: user.id, email: user.email }),
      refreshToken: this.tokens.signRefreshToken(user.id, user.tokenVersion),
    };
  }
}