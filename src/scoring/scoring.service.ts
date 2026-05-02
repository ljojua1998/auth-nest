import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchStat } from '../matches/entities/match-stat.entity';
import { Match, MatchStatus } from '../matches/entities/match.entity';
import { UserMatchScore } from '../matches/entities/user-match-score.entity';
import { UserTeamPlayer } from '../user-teams/entities/user-team-player.entity';
import { UserTeam } from '../user-teams/entities/user-team.entity';
import { PlayerPosition } from '../players/entities/player.entity';
import { CardType } from '../cards/entities/user-card.entity';
import { UserCard } from '../cards/entities/user-card.entity';

interface PlayerPoints {
  playerId: number;
  points: number;
  breakdown: Record<string, number>;
}

@Injectable()
export class ScoringService {
  constructor(
    @InjectRepository(MatchStat)
    private matchStatsRepo: Repository<MatchStat>,
    @InjectRepository(Match)
    private matchesRepo: Repository<Match>,
    @InjectRepository(UserMatchScore)
    private userScoresRepo: Repository<UserMatchScore>,
    @InjectRepository(UserTeam)
    private userTeamsRepo: Repository<UserTeam>,
    @InjectRepository(UserTeamPlayer)
    private utpRepo: Repository<UserTeamPlayer>,
    @InjectRepository(UserCard)
    private cardsRepo: Repository<UserCard>,
  ) {}

  calculatePlayerPoints(stat: MatchStat, position: PlayerPosition): PlayerPoints {
    const b: Record<string, number> = {};
    let total = 0;

    const add = (key: string, val: number) => {
      if (val !== 0) { b[key] = val; total += val; }
    };

    if (stat.minutes > 0) add('appearance', 1);
    if (stat.minutes >= 60) add('60min', 1);

    const goalPts = position === PlayerPosition.GK || position === PlayerPosition.DEF ? 6
      : position === PlayerPosition.MID ? 5 : 4;
    if (stat.goals > 0) add('goals', stat.goals * goalPts);

    if (stat.assists > 0) add('assists', stat.assists * 3);

    if (stat.cleanSheet && stat.minutes >= 60) {
      const csPts = position === PlayerPosition.GK || position === PlayerPosition.DEF ? 4
        : position === PlayerPosition.MID ? 1 : 0;
      if (csPts > 0) add('cleanSheet', csPts);
    }

    if (position === PlayerPosition.GK) {
      const savePts = Math.floor(stat.saves / 3);
      if (savePts > 0) add('saves', savePts);
      if (stat.penaltySaved > 0) add('penaltySaved', stat.penaltySaved * 5);
    }

    if (position === PlayerPosition.GK || position === PlayerPosition.DEF) {
      const concededPts = -Math.floor(stat.goalsConceded / 2);
      if (concededPts < 0) add('goalsConceded', concededPts);
    }

    if (stat.penaltyEarned > 0) add('penaltyEarned', stat.penaltyEarned * 2);
    if (stat.penaltyConceded > 0) add('penaltyConceded', stat.penaltyConceded * -1);
    if (stat.penaltyMissed > 0) add('penaltyMissed', stat.penaltyMissed * -2);
    if (stat.yellowCards > 0) add('yellowCards', stat.yellowCards * -1);
    if (stat.redCards > 0) add('redCards', stat.redCards * -3);
    // BUG-M06: removed extra -1 doubleYellow penalty — not in spec; yellow+red already penalised above
    if (stat.ownGoals > 0) add('ownGoals', stat.ownGoals * -2);

    const tacklePts = Math.floor(stat.tackles / 3);
    if (tacklePts > 0) add('tackles', tacklePts);

    return { playerId: stat.playerId, points: total, breakdown: b };
  }

  async calculateMatchPoints(matchId: number): Promise<{ processed: number }> {
    const match = await this.matchesRepo.findOne({
      where: { id: matchId },
      relations: ['tournament'],
    });
    if (!match) throw new BadRequestException(`Match #${matchId} ვერ მოიძებნა`);
    if (match.status !== MatchStatus.FINISHED) {
      throw new BadRequestException('მატჩი ჯერ დასრულებული არ არის');
    }
    // BUG-018: idempotency guard — prevent double-processing
    if (match.statsCalculated) {
      throw new BadRequestException(`Match #${matchId} ქულები უკვე გამოთვლილია`);
    }

    const stats = await this.matchStatsRepo.find({
      where: { matchId },
      relations: ['player'],
    });

    const playerPointsMap = new Map<number, PlayerPoints>();
    for (const stat of stats) {
      const pts = this.calculatePlayerPoints(stat, stat.player.position);
      playerPointsMap.set(stat.playerId, pts);
    }

    // BUG-006: preload all TC cards before loop to avoid N+1 queries
    const tcCards = await this.cardsRepo.find({
      where: { type: CardType.TRIPLE_CAPTAIN, used: true, usedInTournamentId: match.tournamentId },
    });
    const tcCardsByUserId = new Map(tcCards.map((c) => [c.userId, c]));

    // BUG-C03: preload all existing scores before loop to avoid N+1 queries
    const existingScores = await this.userScoresRepo.find({ where: { matchId } });
    const existingScoreMap = new Map(existingScores.map((s) => [s.userId, s]));

    // BUG-H01: process user teams in batches to avoid loading all into memory at once
    const BATCH_SIZE = 500;
    let processed = 0;

    for (let skip = 0; ; skip += BATCH_SIZE) {
      const allUserTeams = await this.userTeamsRepo.find({
        relations: ['players', 'players.player'],
        take: BATCH_SIZE,
        skip,
      });
      if (allUserTeams.length === 0) break;

      for (const team of allUserTeams) {
        if (team.players.length === 0) continue;

        const starters = team.players.filter((p) => p.isStarter);
        const subs = team.players
          .filter((p) => !p.isStarter)
          .sort((a, b) => (a.subOrder ?? 99) - (b.subOrder ?? 99));

        const usedSubIds = new Set<number>();
        const activePlayers: { playerId: number; isCaptain: boolean }[] = [];

        for (const starter of starters) {
          const stat = stats.find((s) => s.playerId === starter.playerId);
          const played = stat && stat.minutes > 0;

          if (played) {
            activePlayers.push({
              playerId: starter.playerId,
              isCaptain: starter.playerId === team.captainId,
            });
          } else {
            // BUG-003: sub inherits captain status if starter was captain
            // BUG-H05: only mark sub as used if it has actual stats (minutes > 0)
            const sub = subs.find(
              (s) => s.player.position === starter.player.position && !usedSubIds.has(s.id),
            );
            if (sub) {
              const subStat = stats.find((s) => s.playerId === sub.playerId && s.minutes > 0);
              if (subStat) {
                usedSubIds.add(sub.id);
                activePlayers.push({
                  playerId: sub.playerId,
                  isCaptain: starter.playerId === team.captainId,
                });
              }
            }
          }
        }

        // BUG-006: use preloaded map instead of per-team DB query
        const tripleCaptainCard = tcCardsByUserId.get(team.userId);
        const captainMultiplier = tripleCaptainCard ? 3 : 2;

        let totalPoints = 0;
        const breakdown: Record<string, number> = {};

        for (const ap of activePlayers) {
          const pts = playerPointsMap.get(ap.playerId);
          if (!pts) continue;

          let pPoints = pts.points;
          if (ap.isCaptain) pPoints *= captainMultiplier;

          totalPoints += pPoints;
          breakdown[String(ap.playerId)] = pPoints;
        }

        // BUG-C03: use preloaded existingScoreMap instead of per-team findOne query
        const existing = existingScoreMap.get(team.userId);

        if (existing) {
          existing.totalPoints = totalPoints;
          existing.breakdown = breakdown;
          await this.userScoresRepo.save(existing);
        } else {
          await this.userScoresRepo.save(
            this.userScoresRepo.create({
              userId: team.userId,
              matchId,
              tournamentId: match.tournamentId,
              totalPoints,
              breakdown,
            }),
          );
        }

        processed++;
      }
    }

    await this.matchesRepo.update(matchId, { statsCalculated: true });
    return { processed };
  }
}
