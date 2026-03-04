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
}
