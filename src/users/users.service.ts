import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const existingUser = await this.findByEmail(userData.email!);
    if (existingUser) {
      throw new ConflictException(
        'This email is already in use. Please use a different email.',
      );
    }
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  // refresh token-ის შენახვა DB-ში
  async updateRefreshToken(userId: number, refreshToken: string | null) {
    await this.usersRepository.update(userId, { refreshToken });
  }

  // ID-ით მომხმარებლის პოვნა
  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  // ID-ით მომხმარებლის პოვნა + orders relation
  // relations: ['orders'] — orders ცხრილიდანაც წამოიღებს (LEFT JOIN)
  // orders-ში eager: true არ გვაქვს (ყოველთვის არ გვჭირდება), ამიტომ ხელით ვტვირთავთ
  async findByIdWithOrders(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['orders'],
      order: { orders: { createdAt: 'DESC' } },
    });
  }

  // ბალანსის ნახვა
  async getBalance(userId: number): Promise<number> {
    const user = await this.findById(userId);
    if (!user) {
      throw new ConflictException('მომხმარებელი ვერ მოიძებნა');
    }
    return Number(user.balance);
    // Number() იმიტომ რომ decimal ტიპი DB-დან string-ად მოდის
    // მაგ: "5000.00" → 5000
  }

  // ბალანსიდან თანხის გამოკლება
  async deductBalance(userId: number, amount: number): Promise<number> {
    const user = await this.findById(userId);
    if (!user) {
      throw new ConflictException('მომხმარებელი ვერ მოიძებნა');
    }

    const currentBalance = Number(user.balance);
    if (currentBalance < amount) {
      throw new ConflictException('არასაკმარისი ბალანსი');
    }

    const newBalance = currentBalance - amount;
    await this.usersRepository.update(userId, { balance: newBalance });
    return newBalance;
  }
}
