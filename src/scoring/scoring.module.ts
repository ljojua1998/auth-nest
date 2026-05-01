import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchStat } from '../matches/entities/match-stat.entity';
import { Match } from '../matches/entities/match.entity';
import { UserMatchScore } from '../matches/entities/user-match-score.entity';
import { UserTeam } from '../user-teams/entities/user-team.entity';
import { UserTeamPlayer } from '../user-teams/entities/user-team-player.entity';
import { UserCard } from '../cards/entities/user-card.entity';
import { ScoringService } from './scoring.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MatchStat,
      Match,
      UserMatchScore,
      UserTeam,
      UserTeamPlayer,
      UserCard,
    ]),
  ],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
