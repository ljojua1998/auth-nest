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

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('მომხმარებელი ვერ მოიძებნა');

      // BUG-004: lock promo row and re-check maxUses + onePerUser inside transaction
      const lockedPromo = await queryRunner.manager.findOne(PromoCode, {
        where: { id: promo.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedPromo) throw new NotFoundException('Promo კოდი ვერ მოიძებნა');

      if (lockedPromo.maxUses !== null && lockedPromo.usedCount >= lockedPromo.maxUses) {
        throw new BadRequestException('Promo კოდის გამოყენების ლიმიტი ამოიწურა');
      }

      if (lockedPromo.onePerUser) {
        const existing = await queryRunner.manager.findOne(PromoRedemption, {
          where: { userId, promoCodeId: lockedPromo.id },
        });
        if (existing) {
          throw new ConflictException('ამ Promo კოდს უკვე გამოიყენე');
        }
      }

      const bonus = Number(lockedPromo.bonusCoins);
      const before = Number(user.coins);
      const after = before + bonus;

      await queryRunner.manager.update(User, userId, { coins: after });
      await queryRunner.manager.update(PromoCode, lockedPromo.id, {
        usedCount: lockedPromo.usedCount + 1,
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
        `Promo code: ${lockedPromo.code}`,
      );

      await queryRunner.commitTransaction();
      return {
        message: `Promo კოდი "${lockedPromo.code}" წარმატებით გამოყენდა`,
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
    // BUG-L06: only apply whitelisted fields — prevent usedCount/createdAt/id manipulation
    if (data.isActive !== undefined) promo.isActive = data.isActive;
    if (data.maxUses !== undefined) promo.maxUses = data.maxUses;
    if (data.expiresAt !== undefined) promo.expiresAt = data.expiresAt;
    if (data.bonusCoins !== undefined) promo.bonusCoins = data.bonusCoins;
    if (data.onePerUser !== undefined) promo.onePerUser = data.onePerUser;
    return this.promoRepo.save(promo);
  }

  async remove(id: number): Promise<void> {
    const promo = await this.promoRepo.findOne({ where: { id } });
    if (!promo) throw new NotFoundException(`Promo #${id} ვერ მოიძებნა`);
    await this.promoRepo.remove(promo);
  }
}
