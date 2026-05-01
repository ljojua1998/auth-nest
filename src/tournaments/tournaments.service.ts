import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tournament, TournamentStatus } from './entities/tournament.entity';
import { CreateTournamentDto } from './dto/create-tournament.dto';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectRepository(Tournament)
    private tournamentsRepo: Repository<Tournament>,
  ) {}

  async findAll(): Promise<Tournament[]> {
    return this.tournamentsRepo.find({ order: { id: 'ASC' } });
  }

  async findById(id: number): Promise<Tournament> {
    const t = await this.tournamentsRepo.findOne({ where: { id } });
    if (!t) throw new NotFoundException(`Tournament #${id} ვერ მოიძებნა`);
    return t;
  }

  async getCurrent(): Promise<Tournament | null> {
    return this.tournamentsRepo.findOne({
      where: { status: TournamentStatus.ACTIVE },
      order: { id: 'ASC' },
    });
  }

  async create(dto: CreateTournamentDto): Promise<Tournament> {
    const t = this.tournamentsRepo.create(dto);
    return this.tournamentsRepo.save(t);
  }

  async updateStatus(id: number, status: TournamentStatus): Promise<Tournament> {
    const t = await this.findById(id);
    t.status = status;
    return this.tournamentsRepo.save(t);
  }
}
