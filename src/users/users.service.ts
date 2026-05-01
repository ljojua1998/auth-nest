import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const existingUser = await this.findByEmail(userData.email!);
    if (existingUser) {
      throw new ConflictException(
        'ეს email უკვე გამოყენებულია. გთხოვთ გამოიყენოთ სხვა email.',
      );
    }
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async updateRefreshToken(userId: number, refreshToken: string | null) {
    await this.usersRepository.update(userId, { refreshToken });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByIdOrFail(id: number): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('მომხმარებელი ვერ მოიძებნა');
    }
    return user;
  }

  async getCoins(userId: number): Promise<number> {
    const user = await this.findByIdOrFail(userId);
    return Number(user.coins);
  }

  async addCoins(userId: number, amount: number): Promise<number> {
    if (amount <= 0) {
      throw new BadRequestException('Coin-ების რაოდენობა დადებითი უნდა იყოს');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException('მომხმარებელი ვერ მოიძებნა');
      }

      const newCoins = Number(user.coins) + amount;
      await queryRunner.manager.update(User, userId, { coins: newCoins });
      await queryRunner.commitTransaction();
      return newCoins;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deductCoins(userId: number, amount: number): Promise<number> {
    if (amount <= 0) {
      throw new BadRequestException('Coin-ების რაოდენობა დადებითი უნდა იყოს');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException('მომხმარებელი ვერ მოიძებნა');
      }

      const currentCoins = Number(user.coins);
      if (currentCoins < amount) {
        throw new BadRequestException(
          `არასაკმარისი Coin-ები. ბალანსი: ${currentCoins}, საჭირო: ${amount}`,
        );
      }

      const newCoins = currentCoins - amount;
      await queryRunner.manager.update(User, userId, { coins: newCoins });
      await queryRunner.commitTransaction();
      return newCoins;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateProfile(
    userId: number,
    data: { name?: string },
  ): Promise<User> {
    await this.usersRepository.update(userId, data);
    return this.findByIdOrFail(userId);
  }
}
