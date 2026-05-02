import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Player } from './entities/player.entity';
import { PlayersService } from './players.service';
import { PlayersController } from './players.controller';
import { MatchStat } from '../matches/entities/match-stat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Player, MatchStat])],
  controllers: [PlayersController],
  providers: [PlayersService],
  exports: [PlayersService],
})
export class PlayersModule {}
