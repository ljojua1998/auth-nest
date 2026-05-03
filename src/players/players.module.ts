import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player } from './entities/player.entity';
import { PlayersService } from './players.service';
import { PlayersController } from './players.controller';
import { MatchStat } from '../matches/entities/match-stat.entity';
import { Team } from '../teams/entities/team.entity';
import { Tier } from '../tiers/entities/tier.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Player, MatchStat, Team, Tier])],
  controllers: [PlayersController],
  providers: [PlayersService],
  exports: [PlayersService],
})
export class PlayersModule {}
