import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private teamsRepository: Repository<Team>,
  ) {}

  async findAll(): Promise<Team[]> {
    return this.teamsRepository.find({ order: { group: 'ASC', name: 'ASC' } });
  }

  async findById(id: number): Promise<Team> {
    const team = await this.teamsRepository.findOne({ where: { id } });
    if (!team) {
      throw new NotFoundException(`ნაკრები #${id} ვერ მოიძებნა`);
    }
    return team;
  }

  async create(dto: CreateTeamDto): Promise<Team> {
    const existing = await this.teamsRepository.findOne({
      where: [{ name: dto.name }, { code: dto.code }],
    });
    if (existing) {
      throw new ConflictException('ამ სახელის ან კოდის მქონე ნაკრები უკვე არსებობს');
    }
    const team = this.teamsRepository.create(dto);
    return this.teamsRepository.save(team);
  }

  async markEliminated(id: number): Promise<Team> {
    const team = await this.findById(id);
    team.eliminated = true;
    return this.teamsRepository.save(team);
  }

  async seed(): Promise<{ created: number }> {
    const worldCupTeams = [
      { name: 'Argentina', code: 'ARG', group: 'A' },
      { name: 'Australia', code: 'AUS', group: 'A' },
      { name: 'Morocco', code: 'MAR', group: 'A' },
      { name: 'Ukraine', code: 'UKR', group: 'A' },
      { name: 'Spain', code: 'ESP', group: 'B' },
      { name: 'Netherlands', code: 'NED', group: 'B' },
      { name: 'Colombia', code: 'COL', group: 'B' },
      { name: 'Ecuador', code: 'ECU', group: 'B' },
      { name: 'France', code: 'FRA', group: 'C' },
      { name: 'England', code: 'ENG', group: 'C' },
      { name: 'Senegal', code: 'SEN', group: 'C' },
      { name: 'Mexico', code: 'MEX', group: 'C' },
      { name: 'Brazil', code: 'BRA', group: 'D' },
      { name: 'Portugal', code: 'POR', group: 'D' },
      { name: 'USA', code: 'USA', group: 'D' },
      { name: 'Uruguay', code: 'URU', group: 'D' },
      { name: 'Germany', code: 'GER', group: 'E' },
      { name: 'Belgium', code: 'BEL', group: 'E' },
      { name: 'Croatia', code: 'CRO', group: 'E' },
      { name: 'Japan', code: 'JPN', group: 'E' },
      { name: 'Italy', code: 'ITA', group: 'F' },
      { name: 'Denmark', code: 'DEN', group: 'F' },
      { name: 'Serbia', code: 'SRB', group: 'F' },
      { name: 'Cameroon', code: 'CMR', group: 'F' },
      { name: 'Switzerland', code: 'SUI', group: 'G' },
      { name: 'Turkey', code: 'TUR', group: 'G' },
      { name: 'Chile', code: 'CHI', group: 'G' },
      { name: 'Nigeria', code: 'NGA', group: 'G' },
      { name: 'South Korea', code: 'KOR', group: 'H' },
      { name: 'Poland', code: 'POL', group: 'H' },
      { name: 'Iran', code: 'IRN', group: 'H' },
      { name: 'Canada', code: 'CAN', group: 'H' },
    ];

    let created = 0;
    for (const teamData of worldCupTeams) {
      const existing = await this.teamsRepository.findOne({
        where: { code: teamData.code },
      });
      if (!existing) {
        await this.teamsRepository.save(this.teamsRepository.create(teamData));
        created++;
      }
    }
    return { created };
  }
}
