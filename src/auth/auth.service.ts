import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { hash, compare } from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { CardsService } from '../cards/cards.service';
import { User } from '../users/entities/user.entity';
import { UserCard, CardType } from '../cards/entities/user-card.entity';
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
    private cardsService: CardsService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;
    const hashedPassword = await hash(password, 10);

    // BUG-C04: make user creation + card issuing atomic in a single transaction
    // so a failed issueCards does not leave an orphaned user
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('ეს email უკვე გამოყენებულია. გთხოვთ გამოიყენოთ სხვა email.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const newUser = queryRunner.manager.create(User, {
        name,
        email,
        password: hashedPassword,
      });
      const user = await queryRunner.manager.save(User, newUser);

      const cardTypes = [CardType.TRIPLE_CAPTAIN, CardType.WILDCARD, CardType.LIMITLESS];
      const cards = cardTypes.map((type) =>
        queryRunner.manager.create(UserCard, { userId: user.id, type, used: false }),
      );
      await queryRunner.manager.save(UserCard, cards);

      await queryRunner.commitTransaction();

      const { password: _, refreshToken: __, verificationToken: ___, resetToken: ____, resetTokenExpiry: _____, ...result } = user;
      return {
        message: 'რეგისტრაცია წარმატებით დასრულდა',
        user: result,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
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
    // BUG-M02: validate REFRESH_TOKEN_SECRET is set
    const refreshSecret = this.configService.get<string>('REFRESH_TOKEN_SECRET');
    if (!refreshSecret) {
      throw new Error('REFRESH_TOKEN_SECRET env var is required');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: refreshSecret,
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
    const user = await this.usersService.findByIdOrFail(userId);
    const { password: _, refreshToken: __, verificationToken: ___, resetToken: ____, resetTokenExpiry: _____, ...result } = user;
    return { ...result, coins: Number(user.coins) };
  }

  async logout(userId: number) {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'გამოსვლა წარმატებით დასრულდა' };
  }

  private generateTokens(userId: number, email: string) {
    const payload: JwtPayload = { sub: userId, email };

    // BUG-M02: validate REFRESH_TOKEN_SECRET is set to prevent silent fallback to undefined
    const refreshSecret = this.configService.get<string>('REFRESH_TOKEN_SECRET');
    if (!refreshSecret) {
      throw new Error('REFRESH_TOKEN_SECRET env var is required');
    }

    const accessToken = this.jwtService.sign(payload);
    // BUG-005: use separate secret for refresh tokens
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: refreshSecret,
    });

    return { accessToken, refreshToken };
  }
}
