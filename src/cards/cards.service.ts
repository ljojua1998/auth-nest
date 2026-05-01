import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserCard, CardType } from './entities/user-card.entity';
import { ActivateCardDto } from './dto/activate-card.dto';

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(UserCard)
    private cardsRepo: Repository<UserCard>,
  ) {}

  async issueCards(userId: number): Promise<void> {
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
    const card = await this.cardsRepo.findOne({ where: { userId, type } });

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

    return this.cardsRepo.save(card);
  }
}
