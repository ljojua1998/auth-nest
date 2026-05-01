import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromoCode } from './entities/promo-code.entity';
import { PromoRedemption } from './entities/promo-redemption.entity';
import { PromotionsService } from './promotions.service';
import { PromotionsController } from './promotions.controller';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PromoCode, PromoRedemption]),
    TransactionsModule,
  ],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
