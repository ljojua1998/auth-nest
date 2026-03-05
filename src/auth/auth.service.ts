import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hash, compare } from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

interface JwtPayload {
  sub: number;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;
    const hashedPassword = await hash(password, 10);

    const user = await this.usersService.create({
      name,
      email,
      password: hashedPassword,
    });

    const { password: _, ...result } = user;
    return {
      message: 'რეგისტრაცია წარმატებით დასრულდა',
      user: result,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('არასწორი email ან პაროლი');
    }

    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('არასწორი email ან პაროლი');
    }

    const tokens = this.generateTokens(user.id, user.email);

    const hashedRefreshToken = await hash(tokens.refreshToken, 10);
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

    return {
      message: 'ავტორიზაცია წარმატებით დასრულდა',
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('არასწორი ან ვადაგასული refresh token');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('არასწორი refresh token');
    }

    const isRefreshTokenValid = await compare(refreshToken, user.refreshToken);
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('არასწორი refresh token');
    }

    const tokens = this.generateTokens(user.id, user.email);

    const hashedRefreshToken = await hash(tokens.refreshToken, 10);
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

    return tokens;
  }

  async getProfile(userId: number) {
    // findByIdWithOrders — orders relation-ითაც ტვირთავს
    const user = await this.usersService.findByIdWithOrders(userId);
    if (!user) {
      throw new UnauthorizedException('მომხმარებელი ვერ მოიძებნა');
    }
    // password, refreshToken და სხვა sensitive ველებს არ ვაბრუნებთ
    const { password: _, refreshToken: __, ...result } = user;
    return { ...result, balance: Number(user.balance) };
  }

  async logout(userId: number) {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'გამოსვლა წარმატებით დასრულდა' };
  }

  private generateTokens(userId: number, email: string) {
    const payload: JwtPayload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return { accessToken, refreshToken };
  }
}
