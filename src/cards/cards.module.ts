import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCard } from './entities/user-card.entity';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserCard])],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}
