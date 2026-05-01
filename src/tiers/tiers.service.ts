import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tier } from './entities/tier.entity';
import { CreateTierDto } from './dto/create-tier.dto';
import { UpdateTierDto } from './dto/update-tier.dto';

@Injectable()
export class TiersService {
  constructor(
    @InjectRepository(Tier)
    private tiersRepository: Repository<Tier>,
  ) {}

  async findAll(): Promise<Tier[]> {
    return this.tiersRepository.find({ order: { coinPrice: 'DESC' } });
  }

  async findById(id: number): Promise<Tier> {
    const tier = await this.tiersRepository.findOne({ where: { id } });
    if (!tier) {
      throw new NotFoundException(`Tier #${id} ვერ მოიძებნა`);
    }
    return tier;
  }

  async create(dto: CreateTierDto): Promise<Tier> {
    const existing = await this.tiersRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`"${dto.name}" სახელის Tier უკვე არსებობს`);
    }
    const tier = this.tiersRepository.create(dto);
    return this.tiersRepository.save(tier);
  }

  async update(id: number, dto: UpdateTierDto): Promise<Tier> {
    const tier = await this.findById(id);

    if (dto.name && dto.name !== tier.name) {
      const existing = await this.tiersRepository.findOne({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException(`"${dto.name}" სახელის Tier უკვე არსებობს`);
      }
    }

    Object.assign(tier, dto);
    return this.tiersRepository.save(tier);
  }

  async remove(id: number): Promise<void> {
    const tier = await this.findById(id);
    await this.tiersRepository.remove(tier);
  }

  async seed(): Promise<void> {
    const defaultTiers = [
      { name: 'Superstar', coinPrice: 150000 },
      { name: 'Strong', coinPrice: 110000 },
      { name: 'Average', coinPrice: 80000 },
      { name: 'Backup', coinPrice: 55000 },
      { name: 'Reserve', coinPrice: 35000 },
    ];

    for (const tierData of defaultTiers) {
      const existing = await this.tiersRepository.findOne({
        where: { name: tierData.name },
      });
      if (!existing) {
        await this.tiersRepository.save(this.tiersRepository.create(tierData));
      }
    }
  }
}
