import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Match } from './entities/match.entity';
import { MatchStat } from './entities/match-stat.entity';
import { UserMatchScore } from './entities/user-match-score.entity';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Match, MatchStat, UserMatchScore])],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
