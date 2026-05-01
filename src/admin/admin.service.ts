import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Match, MatchStatus } from '../matches/entities/match.entity';
import { UserTeamPlayer } from '../user-teams/entities/user-team-player.entity';
import { UserTeamHistory, TransferAction } from '../user-teams/entities/user-team-history.entity';
import { Team } from '../teams/entities/team.entity';
import { User } from '../users/entities/user.entity';
import { MarketplaceService } from '../marketplace/marketplace.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { ScoringService } from '../scoring/scoring.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionType } from '../transactions/entities/transaction.entity';
import { TournamentStatus } from '../tournaments/entities/tournament.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Match)
    private matchesRepo: Repository<Match>,
    @InjectRepository(UserTeamPlayer)
    private utpRepo: Repository<UserTeamPlayer>,
    @InjectRepository(UserTeamHistory)
    private historyRepo: Repository<UserTeamHistory>,
    @InjectRepository(Team)
    private teamsRepo: Repository<Team>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private marketplaceService: MarketplaceService,
    private leaderboardService: LeaderboardService,
    private scoringService: ScoringService,
    private tournamentsService: TournamentsService,
    private transactionsService: TransactionsService,
    private dataSource: DataSource,
  ) {}

  async calculatePoints(matchId: number) {
    return this.scoringService.calculateMatchPoints(matchId);
  }

  async snapshotLeaderboard(tournamentId: number) {
    return this.leaderboardService.snapshotLeaderboard(tournamentId);
  }

  async distributePrizes(tournamentId: number) {
    return this.leaderboardService.distributePrizes(tournamentId);
  }

  async openMarketplace() {
    return this.marketplaceService.open();
  }

  async closeMarketplace() {
    return this.marketplaceService.close();
  }

  async activateTournament(tournamentId: number) {
    return this.tournamentsService.updateStatus(tournamentId, TournamentStatus.ACTIVE);
  }

  async completeTournament(tournamentId: number) {
    return this.tournamentsService.updateStatus(tournamentId, TournamentStatus.COMPLETED);
  }

  async updateMatchStatus(matchId: number, status: MatchStatus) {
    const match = await this.matchesRepo.findOne({ where: { id: matchId } });
    if (!match) throw new BadRequestException(`Match #${matchId} ვერ მოიძებნა`);
    match.status = status;
    return this.matchesRepo.save(match);
  }

  async processElimination(teamId: number): Promise<{ removedPlayers: number; refundedUsers: number }> {
    const team = await this.teamsRepo.findOne({ where: { id: teamId } });
    if (!team) throw new BadRequestException(`Team #${teamId} ვერ მოიძებნა`);

    const utps = await this.utpRepo.find({
      where: { player: { teamId } },
      relations: ['player', 'player.tier', 'userTeam'],
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userRefunds = new Map<number, number>();

      for (const utp of utps) {
        const refundAmount = Number(utp.player.tier.coinPrice);
        const uid = utp.userTeam.userId;
        userRefunds.set(uid, (userRefunds.get(uid) ?? 0) + refundAmount);
      }

      for (const [uid, refund] of userRefunds.entries()) {
        const user = await queryRunner.manager.findOne(User, {
          where: { id: uid },
          lock: { mode: 'pessimistic_write' },
        });
        if (!user) continue;

        const before = Number(user.coins);
        const after = before + refund;
        await queryRunner.manager.update(User, uid, { coins: after });

        await this.transactionsService.log(
          queryRunner.manager,
          uid,
          TransactionType.ELIMINATION_REFUND,
          refund,
          before,
          after,
          `Elimination refund: ${team.name}`,
        );
      }

      for (const utp of utps) {
        const history = queryRunner.manager.create(UserTeamHistory, {
          userId: utp.userTeam.userId,
          playerId: utp.playerId,
          playerName: utp.player.name,
          action: TransferAction.ELIMINATION_REMOVED,
          coinAmount: Number(utp.player.tier.coinPrice),
        });
        await queryRunner.manager.save(UserTeamHistory, history);
        await queryRunner.manager.delete(UserTeamPlayer, { id: utp.id });
      }

      await queryRunner.manager.update(Team, teamId, { eliminated: true });
      await queryRunner.commitTransaction();

      return {
        removedPlayers: utps.length,
        refundedUsers: userRefunds.size,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
