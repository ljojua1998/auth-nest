import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match, MatchStatus } from './entities/match.entity';
import { MatchStat } from './entities/match-stat.entity';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private matchesRepo: Repository<Match>,
    @InjectRepository(MatchStat)
    private matchStatsRepo: Repository<MatchStat>,
  ) {}

  async findAll(): Promise<Match[]> {
    return this.matchesRepo.find({
      relations: ['homeTeam', 'awayTeam', 'tournament'],
      order: { kickoff: 'ASC' },
    });
  }

  async findById(id: number): Promise<Match> {
    const match = await this.matchesRepo.findOne({
      where: { id },
      relations: ['homeTeam', 'awayTeam', 'tournament'],
    });
    if (!match) throw new NotFoundException(`Match #${id} ვერ მოიძებნა`);
    return match;
  }

  async findLive(): Promise<Match[]> {
    return this.matchesRepo.find({
      where: { status: MatchStatus.LIVE },
      relations: ['homeTeam', 'awayTeam', 'tournament'],
    });
  }

  async getMatchStats(matchId: number): Promise<MatchStat[]> {
    await this.findById(matchId);
    return this.matchStatsRepo.find({
      where: { matchId },
      relations: ['player', 'player.team'],
    });
  }

  async create(data: Partial<Match>): Promise<Match> {
    const match = this.matchesRepo.create(data);
    return this.matchesRepo.save(match);
  }

  async upsertStat(data: Partial<MatchStat>): Promise<MatchStat> {
    const existing = await this.matchStatsRepo.findOne({
      where: { matchId: data.matchId!, playerId: data.playerId! },
    });
    if (existing) {
      Object.assign(existing, data);
      return this.matchStatsRepo.save(existing);
    }
    return this.matchStatsRepo.save(this.matchStatsRepo.create(data));
  }

  async updateStatus(id: number, status: MatchStatus): Promise<Match> {
    const match = await this.findById(id);
    match.status = status;
    return this.matchesRepo.save(match);
  }
}
