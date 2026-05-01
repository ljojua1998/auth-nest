import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTeam } from './entities/user-team.entity';
import { UserTeamPlayer } from './entities/user-team-player.entity';
import { UserTeamHistory } from './entities/user-team-history.entity';
import { UserTeamsService } from './user-teams.service';
import { UserTeamsController } from './user-teams.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserTeam, UserTeamPlayer, UserTeamHistory])],
  controllers: [UserTeamsController],
  providers: [UserTeamsService],
  exports: [UserTeamsService],
})
export class UserTeamsModule {}
