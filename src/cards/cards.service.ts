import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UserCard, CardType } from './entities/user-card.entity';
import { ActivateCardDto } from './dto/activate-card.dto';
import { TournamentsService } from '../tournaments/tournaments.service';

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(UserCard)
    private cardsRepo: Repository<UserCard>,
    private tournamentsService: TournamentsService,
    private dataSource: DataSource,
  ) {}

  async issueCards(userId: number): Promise<void> {
    // BUG-024: idempotency — skip if cards already issued
    const existing = await this.cardsRepo.count({ where: { userId } });
    if (existing > 0) return;

    const types = [CardType.TRIPLE_CAPTAIN, CardType.WILDCARD, CardType.LIMITLESS];
    const cards = types.map((type) =>
      this.cardsRepo.create({ userId, type, used: false }),
    );
    await this.cardsRepo.save(cards);
  }

  async getMyCards(userId: number): Promise<UserCard[]> {
    return this.cardsRepo.find({ where: { userId }, order: { type: 'ASC' } });
  }

  async activateCard(
    userId: number,
    type: CardType,
    dto: ActivateCardDto,
  ): Promise<UserCard> {
    // BUG-009: validate tournament exists before activating card
    await this.tournamentsService.findById(dto.tournamentId);

    // BUG-C02: wrap in transaction with pessimistic_write lock to prevent race condition
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const card = await queryRunner.manager.findOne(UserCard, {
        where: { userId, type },
        lock: { mode: 'pessimistic_write' },
      });

      if (!card) {
        throw new NotFoundException(`${type} Card ვერ მოიძებნა`);
      }
      if (card.used) {
        throw new BadRequestException(
          `${type} Card უკვე გამოყენებულია (Tournament #${card.usedInTournamentId})`,
        );
      }

      card.used = true;
      card.usedAt = new Date();
      card.usedInTournamentId = dto.tournamentId;

      const saved = await queryRunner.manager.save(UserCard, card);
      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
