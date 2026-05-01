import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from './entities/player.entity';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { FilterPlayersDto } from './dto/filter-players.dto';

@Injectable()
export class PlayersService {
  constructor(
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
  ) {}

  async findAll(filters: FilterPlayersDto): Promise<Player[]> {
    const qb = this.playersRepository
      .createQueryBuilder('player')
      .leftJoinAndSelect('player.team', 'team')
      .leftJoinAndSelect('player.tier', 'tier')
      .orderBy('tier.coinPrice', 'DESC')
      .addOrderBy('player.name', 'ASC');

    if (filters.position) {
      qb.andWhere('player.position = :position', { position: filters.position });
    }
    if (filters.tierId) {
      qb.andWhere('player.tierId = :tierId', { tierId: filters.tierId });
    }
    if (filters.teamId) {
      qb.andWhere('player.teamId = :teamId', { teamId: filters.teamId });
    }
    if (filters.search) {
      qb.andWhere('LOWER(player.name) LIKE LOWER(:search)', {
        search: `%${filters.search}%`,
      });
    }

    return qb.getMany();
  }

  async findById(id: number): Promise<Player> {
    const player = await this.playersRepository.findOne({
      where: { id },
      relations: ['team', 'tier'],
    });
    if (!player) {
      throw new NotFoundException(`ფეხბურთელი #${id} ვერ მოიძებნა`);
    }
    return player;
  }

  async create(dto: CreatePlayerDto): Promise<Player> {
    const player = this.playersRepository.create(dto);
    return this.playersRepository.save(player);
  }

  async update(id: number, dto: UpdatePlayerDto): Promise<Player> {
    const player = await this.findById(id);
    Object.assign(player, dto);
    return this.playersRepository.save(player);
  }

  async findByTeam(teamId: number): Promise<Player[]> {
    return this.playersRepository.find({
      where: { teamId },
      relations: ['tier'],
      order: { position: 'ASC', name: 'ASC' },
    });
  }
}
