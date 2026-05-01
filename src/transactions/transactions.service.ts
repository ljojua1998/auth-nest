import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Transaction, TransactionType } from './entities/transaction.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
  ) {}

  async log(
    manager: EntityManager,
    userId: number,
    type: TransactionType,
    amount: number,
    balanceBefore: number,
    balanceAfter: number,
    description: string | null = null,
  ): Promise<Transaction> {
    const tx = manager.create(Transaction, {
      userId,
      type,
      amount,
      balanceBefore,
      balanceAfter,
      description,
    });
    return manager.save(Transaction, tx);
  }

  async getMyHistory(userId: number): Promise<Transaction[]> {
    return this.transactionsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
