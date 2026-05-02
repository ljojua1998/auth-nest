import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MarketplaceStatus } from './entities/marketplace-status.entity';
import { PlayersService } from '../players/players.service';
import { TransactionsService } from '../transactions/transactions.service';
import { User } from '../users/entities/user.entity';
import { UserTeam } from '../user-teams/entities/user-team.entity';
import { UserTeamPlayer } from '../user-teams/entities/user-team-player.entity';
import { UserTeamHistory, TransferAction } from '../user-teams/entities/user-team-history.entity';
import { TransactionType } from '../transactions/entities/transaction.entity';
import { PlayerPosition } from '../players/entities/player.entity';
import { FilterPlayersDto } from '../players/dto/filter-players.dto';

const TEAM_MAX = 15;
const POSITION_MAX: Record<PlayerPosition, number> = {
  [PlayerPosition.GK]: 2,
  [PlayerPosition.DEF]: 5,
  [PlayerPosition.MID]: 5,
  [PlayerPosition.FWD]: 3,
};

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(MarketplaceStatus)
    private statusRepo: Repository<MarketplaceStatus>,
    private playersService: PlayersService,
    private transactionsService: TransactionsService,
    private dataSource: DataSource,
  ) {}

  async getStatus(): Promise<MarketplaceStatus> {
    let status = await this.statusRepo.findOne({ where: { id: 1 } });
    if (!status) {
      status = this.statusRepo.create({ id: 1, isOpen: false });
      status = await this.statusRepo.save(status);
    }
    return status;
  }

  async getAvailablePlayers(filters: FilterPlayersDto) {
    return this.playersService.findAll(filters);
  }

  async buy(userId: number, playerId: number): Promise<{ message: string; coinsLeft: number }> {
    // Fast pre-check outside transaction (race window is acceptable — re-checked inside tx)
    const preStatus = await this.getStatus();
    if (!preStatus.isOpen) {
      throw new ForbiddenException('Marketplace ამჟამად დახურულია. ელოდე ეტაპის პაუზას.');
    }

    const player = await this.playersService.findById(playerId);

    // BUG-012: reject eliminated team players
    if (player.team.eliminated) {
      throw new BadRequestException(`${player.name}-ის გუნდი ელიმინირებულია. ვეღარ ყიდულობ ამ ფეხბ.`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // BUG-M05: re-check marketplace status inside transaction to close race window
      const status = await queryRunner.manager.findOne(MarketplaceStatus, { where: { id: 1 } });
      if (!status?.isOpen) {
        throw new ForbiddenException('Marketplace ამჟამად დახურულია. ელოდე ეტაპის პაუზას.');
      }

      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('მომხმარებელი ვერ მოიძებნა');

      // BUG-001: all team validation inside transaction with pessimistic lock
      let userTeam = await queryRunner.manager.findOne(UserTeam, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!userTeam) {
        userTeam = queryRunner.manager.create(UserTeam, {
          userId,
          formation: '4-3-3',
          captainId: null,
        });
        userTeam = await queryRunner.manager.save(UserTeam, userTeam);
      }

      const utps = await queryRunner.manager.find(UserTeamPlayer, {
        where: { userTeamId: userTeam.id },
        relations: ['player'],
      });

      if (utps.length >= TEAM_MAX) {
        throw new BadRequestException(`გუნდი სავსეა (${TEAM_MAX} ფეხბ.). ჯერ გაყიდე ვინმე.`);
      }

      const alreadyIn = utps.find((p) => p.playerId === playerId);
      if (alreadyIn) {
        throw new BadRequestException('ეს ფეხბურთელი შენს გუნდში უკვე არის');
      }

      const positionCount = utps.filter((p) => p.player.position === player.position).length;
      if (positionCount >= POSITION_MAX[player.position]) {
        throw new BadRequestException(
          `${player.position} პოზიციაზე მაქსიმუმ ${POSITION_MAX[player.position]} ფეხბ. შეგიძლია. ახლა გყავს: ${positionCount}`,
        );
      }

      const price = Number(player.tier.coinPrice);
      const currentCoins = Number(user.coins);

      if (currentCoins < price) {
        throw new BadRequestException(
          `არასაკმარისი Coin-ები. ბალანსი: ${currentCoins}, ფასი: ${price}`,
        );
      }

      const newCoins = currentCoins - price;
      await queryRunner.manager.update(User, userId, { coins: newCoins });

      const utp = queryRunner.manager.create(UserTeamPlayer, {
        userTeamId: userTeam.id,
        playerId,
        isStarter: false,
        subOrder: null,
      });
      await queryRunner.manager.save(UserTeamPlayer, utp);

      const history = queryRunner.manager.create(UserTeamHistory, {
        userId,
        playerId,
        playerName: player.name,
        action: TransferAction.BUY,
        coinAmount: price,
      });
      await queryRunner.manager.save(UserTeamHistory, history);

      await this.transactionsService.log(
        queryRunner.manager,
        userId,
        TransactionType.PLAYER_BUY,
        price,
        currentCoins,
        newCoins,
        `Bought ${player.name}`,
      );

      await queryRunner.commitTransaction();
      return { message: `${player.name} წარმატებით დაემატა გუნდს`, coinsLeft: newCoins };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async sell(userId: number, playerId: number): Promise<{ message: string; coinsLeft: number }> {
    // Fast pre-check outside transaction (race window is acceptable — re-checked inside tx)
    const preStatus = await this.getStatus();
    if (!preStatus.isOpen) {
      throw new ForbiddenException('Marketplace ამჟამად დახურულია.');
    }

    const player = await this.playersService.findById(playerId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // BUG-M05: re-check marketplace status inside transaction to close race window
      const status = await queryRunner.manager.findOne(MarketplaceStatus, { where: { id: 1 } });
      if (!status?.isOpen) {
        throw new ForbiddenException('Marketplace ამჟამად დახურულია.');
      }

      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('მომხმარებელი ვერ მოიძებნა');

      // BUG-C01: lock UserTeam to prevent TOCTOU on parallel sell requests
      const currentTeam = await queryRunner.manager.findOne(UserTeam, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });
      const utpEntry = currentTeam
        ? await queryRunner.manager.findOne(UserTeamPlayer, {
            where: { userTeamId: currentTeam.id, playerId },
            lock: { mode: 'pessimistic_write' },
          })
        : null;

      if (!utpEntry) {
        throw new BadRequestException('ეს ფეხბურთელი შენს გუნდში არ არის');
      }

      const price = Number(player.tier.coinPrice);
      const currentCoins = Number(user.coins);
      const newCoins = currentCoins + price;

      await queryRunner.manager.update(User, userId, { coins: newCoins });
      await queryRunner.manager.delete(UserTeamPlayer, { id: utpEntry.id });

      if (currentTeam?.captainId === playerId) {
        await queryRunner.manager.update(UserTeam, currentTeam.id, { captainId: null });
      }

      const history = queryRunner.manager.create(UserTeamHistory, {
        userId,
        playerId,
        playerName: player.name,
        action: TransferAction.SELL,
        coinAmount: price,
      });
      await queryRunner.manager.save(UserTeamHistory, history);

      await this.transactionsService.log(
        queryRunner.manager,
        userId,
        TransactionType.PLAYER_SELL,
        price,
        currentCoins,
        newCoins,
        `Sold ${player.name}`,
      );

      await queryRunner.commitTransaction();
      return { message: `${player.name} გაიყიდა`, coinsLeft: newCoins };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async open(): Promise<MarketplaceStatus> {
    await this.statusRepo.upsert(
      { id: 1, isOpen: true, openedAt: new Date(), closedAt: null },
      ['id'],
    );
    return this.getStatus();
  }

  async close(): Promise<MarketplaceStatus> {
    await this.statusRepo.upsert(
      { id: 1, isOpen: false, closedAt: new Date() },
      ['id'],
    );
    return this.getStatus();
  }
}
