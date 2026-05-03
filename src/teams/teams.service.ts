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
      // Group A
      { name: 'USA', code: 'USA', group: 'A' },
      { name: 'Panama', code: 'PAN', group: 'A' },
      { name: 'Albania', code: 'ALB', group: 'A' },
      { name: 'Ukraine', code: 'UKR', group: 'A' },
      // Group B
      { name: 'Mexico', code: 'MEX', group: 'B' },
      { name: 'Jamaica', code: 'JAM', group: 'B' },
      { name: 'Honduras', code: 'HON', group: 'B' },
      { name: 'Uzbekistan', code: 'UZB', group: 'B' },
      // Group C
      { name: 'Canada', code: 'CAN', group: 'C' },
      { name: 'Morocco', code: 'MAR', group: 'C' },
      { name: 'Belgium', code: 'BEL', group: 'C' },
      { name: 'Croatia', code: 'CRO', group: 'C' },
      // Group D
      { name: 'Brazil', code: 'BRA', group: 'D' },
      { name: 'Germany', code: 'GER', group: 'D' },
      { name: 'Japan', code: 'JPN', group: 'D' },
      { name: 'Chile', code: 'CHI', group: 'D' },
      // Group E
      { name: 'Argentina', code: 'ARG', group: 'E' },
      { name: 'France', code: 'FRA', group: 'E' },
      { name: 'Netherlands', code: 'NED', group: 'E' },
      { name: 'Saudi Arabia', code: 'KSA', group: 'E' },
      // Group F
      { name: 'Spain', code: 'ESP', group: 'F' },
      { name: 'Portugal', code: 'POR', group: 'F' },
      { name: 'England', code: 'ENG', group: 'F' },
      { name: 'Serbia', code: 'SRB', group: 'F' },
      // Group G
      { name: 'Italy', code: 'ITA', group: 'G' },
      { name: 'Switzerland', code: 'SUI', group: 'G' },
      { name: 'South Korea', code: 'KOR', group: 'G' },
      { name: 'Colombia', code: 'COL', group: 'G' },
      // Group H
      { name: 'Uruguay', code: 'URU', group: 'H' },
      { name: 'Ecuador', code: 'ECU', group: 'H' },
      { name: 'Denmark', code: 'DEN', group: 'H' },
      { name: 'Senegal', code: 'SEN', group: 'H' },
      // Group I
      { name: 'Turkey', code: 'TUR', group: 'I' },
      { name: 'Austria', code: 'AUT', group: 'I' },
      { name: 'Nigeria', code: 'NGA', group: 'I' },
      { name: 'Costa Rica', code: 'CRC', group: 'I' },
      // Group J
      { name: 'Poland', code: 'POL', group: 'J' },
      { name: 'Hungary', code: 'HUN', group: 'J' },
      { name: 'Iran', code: 'IRN', group: 'J' },
      { name: 'Venezuela', code: 'VEN', group: 'J' },
      // Group K
      { name: 'Paraguay', code: 'PAR', group: 'K' },
      { name: 'Australia', code: 'AUS', group: 'K' },
      { name: 'Egypt', code: 'EGY', group: 'K' },
      { name: 'Scotland', code: 'SCO', group: 'K' },
      // Group L
      { name: 'DR Congo', code: 'COD', group: 'L' },
      { name: 'Slovakia', code: 'SVK', group: 'L' },
      { name: 'South Africa', code: 'RSA', group: 'L' },
      { name: 'New Zealand', code: 'NZL', group: 'L' },
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
