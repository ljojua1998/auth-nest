import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournament } from './entities/tournament.entity';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tournament])],
  controllers: [TournamentsController],
  providers: [TournamentsService],
  exports: [TournamentsService],
})
export class TournamentsModule {}
