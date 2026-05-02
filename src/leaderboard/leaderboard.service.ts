import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { LeaderboardSnapshot } from './entities/leaderboard-snapshot.entity';
import { UserMatchScore } from '../matches/entities/user-match-score.entity';
import { User } from '../users/entities/user.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionType } from '../transactions/entities/transaction.entity';

const PRIZE_TABLE: Record<number, number> = {
  1: 1000000,
  2: 900000,
  3: 800000,
  4: 700000,
  5: 600000,
};

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(LeaderboardSnapshot)
    private snapshotsRepo: Repository<LeaderboardSnapshot>,
    @InjectRepository(UserMatchScore)
    private userScoresRepo: Repository<UserMatchScore>,
    private transactionsService: TransactionsService,
    private dataSource: DataSource,
  ) {}

  async getLeaderboard(
    tournamentId: number,
    userId?: number,
  ): Promise<{ top100: LeaderboardSnapshot[]; myRank: LeaderboardSnapshot | null }> {
    const top100 = await this.snapshotsRepo.find({
      where: { tournamentId },
      order: { rank: 'ASC' },
      take: 100,
      relations: ['user'],
    });

    let myRank: LeaderboardSnapshot | null = null;
    if (userId) {
      myRank = await this.snapshotsRepo.findOne({
        where: { tournamentId, userId },
        relations: ['user'],
      });
    }

    return { top100, myRank };
  }

  async getGlobal(userId?: number) {
    // BUG-019: join with user to include names
    const result = await this.userScoresRepo
      .createQueryBuilder('ums')
      .select('ums.userId', 'userId')
      .addSelect('SUM(ums.totalPoints)', 'totalPoints')
      .addSelect('u.name', 'userName')
      .leftJoin(User, 'u', 'u.id = ums.userId')
      .groupBy('ums.userId')
      .addGroupBy('u.name')
      .orderBy('"totalPoints"', 'DESC')
      .limit(100)
      .getRawMany<{ userId: string; totalPoints: string; userName: string }>();

    const ranked = result.map((r, i) => ({
      rank: i + 1,
      // BUG-010: raw query returns userId as string from PostgreSQL
      userId: Number(r.userId),
      userName: r.userName,
      totalPoints: Number(r.totalPoints),
    }));

    // BUG-010: compare with Number(r.userId) so equality works
    const myRank = userId ? ranked.find((r) => r.userId === userId) ?? null : null;

    return { top100: ranked, myRank };
  }

  async snapshotLeaderboard(tournamentId: number): Promise<{ snapshotted: number }> {
    const scores = await this.userScoresRepo
      .createQueryBuilder('ums')
      .select('ums.userId', 'userId')
      .addSelect('SUM(ums.totalPoints)', 'totalPoints')
      .where('ums.tournamentId = :tournamentId', { tournamentId })
      .groupBy('ums.userId')
      .orderBy('"totalPoints"', 'DESC')
      .getRawMany<{ userId: string; totalPoints: string }>();

    let rank = 1;
    const snapshots: Partial<LeaderboardSnapshot>[] = [];

    for (let i = 0; i < scores.length; ) {
      const currentPoints = Number(scores[i].totalPoints);
      const tied: number[] = [];

      while (i < scores.length && Number(scores[i].totalPoints) === currentPoints) {
        tied.push(Number(scores[i].userId));
        i++;
      }

      for (const uid of tied) {
        snapshots.push({
          tournamentId,
          userId: uid,
          rank,
          totalPoints: currentPoints,
          prizeCoins: 0,
        });
      }

      rank += tied.length;
    }

    // BUG-028: wrap delete + insert in a transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.delete(LeaderboardSnapshot, { tournamentId });
      await queryRunner.manager.save(LeaderboardSnapshot, snapshots as LeaderboardSnapshot[]);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    return { snapshotted: snapshots.length };
  }

  async distributePrizes(tournamentId: number): Promise<{ distributed: number }> {
    const snapshots = await this.snapshotsRepo.find({
      where: { tournamentId },
      order: { rank: 'ASC' },
    });

    const rankGroups = new Map<number, number[]>();
    for (const s of snapshots) {
      if (!PRIZE_TABLE[s.rank]) continue;
      if (!rankGroups.has(s.rank)) rankGroups.set(s.rank, []);
      rankGroups.get(s.rank)!.push(s.userId);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let distributed = 0;
      // BUG-H03: sort user IDs consistently to avoid deadlocks when locking multiple rows
      const allRankEntries = [...rankGroups.entries()].map(([rank, userIds]) => ({
        rank,
        // sort userIds ascending so lock order is deterministic across transactions
        userIds: [...userIds].sort((a, b) => a - b),
      }));

      for (const { rank, userIds } of allRankEntries) {
        const totalPrize = userIds.reduce((sum, _, idx) => {
          const r = rank + idx;
          return sum + (PRIZE_TABLE[r] ?? 0);
        }, 0);
        const perUser = Math.floor(totalPrize / userIds.length);

        for (const uid of userIds) {
          const user = await queryRunner.manager.findOne(User, {
            where: { id: uid },
            lock: { mode: 'pessimistic_write' },
          });
          if (!user) continue;

          const before = Number(user.coins);
          const after = before + perUser;
          await queryRunner.manager.update(User, uid, { coins: after });

          await this.transactionsService.log(
            queryRunner.manager,
            uid,
            TransactionType.PRIZE,
            perUser,
            before,
            after,
            `Prize for Tournament #${tournamentId} Rank #${rank}`,
          );

          await queryRunner.manager.update(
            LeaderboardSnapshot,
            { tournamentId, userId: uid },
            { prizeCoins: perUser },
          );

          distributed++;
        }
      }

      await queryRunner.commitTransaction();
      return { distributed };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
