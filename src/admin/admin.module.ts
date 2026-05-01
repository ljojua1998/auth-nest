import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from '../matches/entities/match.entity';
import { UserTeamPlayer } from '../user-teams/entities/user-team-player.entity';
import { UserTeamHistory } from '../user-teams/entities/user-team-history.entity';
import { Team } from '../teams/entities/team.entity';
import { User } from '../users/entities/user.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { ScoringModule } from '../scoring/scoring.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, UserTeamPlayer, UserTeamHistory, Team, User]),
    MarketplaceModule,
    LeaderboardModule,
    ScoringModule,
    TournamentsModule,
    TransactionsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
