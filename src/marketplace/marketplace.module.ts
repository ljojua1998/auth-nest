import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketplaceStatus } from './entities/marketplace-status.entity';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { PlayersModule } from '../players/players.module';
import { UserTeamsModule } from '../user-teams/user-teams.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketplaceStatus]),
    PlayersModule,
    UserTeamsModule,
    TransactionsModule,
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
