import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './entities/team.entity';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { PlayersModule } from '../players/players.module';

@Module({
  imports: [TypeOrmModule.forFeature([Team]), PlayersModule],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
