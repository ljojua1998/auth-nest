import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PromoCode } from './entities/promo-code.entity';
import { PromoRedemption } from './entities/promo-redemption.entity';
import { CreatePromoDto } from './dto/create-promo.dto';
import { RedeemPromoDto } from './dto/redeem-promo.dto';
import { User } from '../users/entities/user.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionType } from '../transactions/entities/transaction.entity';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(PromoCode)
    private promoRepo: Repository<PromoCode>,
    @InjectRepository(PromoRedemption)
    private redemptionRepo: Repository<PromoRedemption>,
    private transactionsService: TransactionsService,
    private dataSource: DataSource,
  ) {}

  async redeem(
    userId: number,
    dto: RedeemPromoDto,
  ): Promise<{ message: string; bonusCoins: number; coinsNow: number }> {
    const promo = await this.promoRepo.findOne({ where: { code: dto.code } });

    if (!promo || !promo.isActive) {
      throw new NotFoundException('Promo კოდი ვერ მოიძებნა ან გამოთიშულია');
    }

    if (promo.expiresAt && new Date() > promo.expiresAt) {
      throw new BadRequestException('Promo კოდის ვადა გასულია');
    }

    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('Promo კოდის გამოყენების ლიმიტი ამოიწურა');
    }

    if (promo.onePerUser) {
      const existing = await this.redemptionRepo.findOne({
        where: { userId, promoCodeId: promo.id },
      });
      if (existing) {
        throw new ConflictException('ამ Promo კოდს უკვე გამოიყენე');
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('მომხმარებელი ვერ მოიძებნა');

      const bonus = Number(promo.bonusCoins);
      const before = Number(user.coins);
      const after = before + bonus;

      await queryRunner.manager.update(User, userId, { coins: after });
      await queryRunner.manager.update(PromoCode, promo.id, {
        usedCount: promo.usedCount + 1,
      });

      const redemption = queryRunner.manager.create(PromoRedemption, {
        userId,
        promoCodeId: promo.id,
      });
      await queryRunner.manager.save(PromoRedemption, redemption);

      await this.transactionsService.log(
        queryRunner.manager,
        userId,
        TransactionType.PROMO,
        bonus,
        before,
        after,
        `Promo code: ${promo.code}`,
      );

      await queryRunner.commitTransaction();
      return {
        message: `Promo კოდი "${promo.code}" წარმატებით გამოყენდა`,
        bonusCoins: bonus,
        coinsNow: after,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getMyRedemptions(userId: number): Promise<PromoRedemption[]> {
    return this.redemptionRepo.find({
      where: { userId },
      order: { redeemedAt: 'DESC' },
    });
  }

  async create(dto: CreatePromoDto): Promise<PromoCode> {
    const existing = await this.promoRepo.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`კოდი "${dto.code}" უკვე არსებობს`);
    const promo = this.promoRepo.create(dto);
    return this.promoRepo.save(promo);
  }

  async findAll(): Promise<PromoCode[]> {
    return this.promoRepo.find({ order: { createdAt: 'DESC' } });
  }

  async update(id: number, data: Partial<PromoCode>): Promise<PromoCode> {
    const promo = await this.promoRepo.findOne({ where: { id } });
    if (!promo) throw new NotFoundException(`Promo #${id} ვერ მოიძებნა`);
    Object.assign(promo, data);
    return this.promoRepo.save(promo);
  }

  async remove(id: number): Promise<void> {
    const promo = await this.promoRepo.findOne({ where: { id } });
    if (!promo) throw new NotFoundException(`Promo #${id} ვერ მოიძებნა`);
    await this.promoRepo.remove(promo);
  }
}
