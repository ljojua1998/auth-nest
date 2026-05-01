import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tier } from './entities/tier.entity';
import { TiersService } from './tiers.service';
import { TiersController } from './tiers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tier])],
  controllers: [TiersController],
  providers: [TiersService],
  exports: [TiersService],
})
export class TiersModule {}
