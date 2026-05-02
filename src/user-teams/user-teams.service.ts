import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserTeam, VALID_FORMATIONS } from './entities/user-team.entity';
import { UserTeamPlayer } from './entities/user-team-player.entity';
import { UserTeamHistory } from './entities/user-team-history.entity';
import { SetFormationDto } from './dto/set-formation.dto';
import { SetCaptainDto } from './dto/set-captain.dto';
import { SetLineupDto } from './dto/set-lineup.dto';
import { PlayerPosition } from '../players/entities/player.entity';

const POSITION_MAX: Record<PlayerPosition, number> = {
  [PlayerPosition.GK]: 2,
  [PlayerPosition.DEF]: 5,
  [PlayerPosition.MID]: 5,
  [PlayerPosition.FWD]: 3,
};

@Injectable()
export class UserTeamsService {
  constructor(
    @InjectRepository(UserTeam)
    private userTeamRepo: Repository<UserTeam>,
    @InjectRepository(UserTeamPlayer)
    private utpRepo: Repository<UserTeamPlayer>,
    @InjectRepository(UserTeamHistory)
    private historyRepo: Repository<UserTeamHistory>,
  ) {}

  async getOrCreateTeam(userId: number): Promise<UserTeam> {
    const existing = await this.userTeamRepo.findOne({
      where: { userId },
      relations: ['players', 'players.player', 'players.player.tier', 'players.player.team'],
    });
    if (existing) return existing;

    // BUG-M09: handle race condition on parallel first-time team creation
    // If two requests arrive simultaneously, one INSERT will fail with unique violation
    // — catch it and fall back to findOne
    try {
      const newTeam = this.userTeamRepo.create({ userId, formation: '4-3-3', captainId: null });
      const saved = await this.userTeamRepo.save(newTeam);
      saved.players = [];
      return saved;
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      // PostgreSQL unique_violation error code
      if (pgErr?.code === '23505') {
        const team = await this.userTeamRepo.findOne({
          where: { userId },
          relations: ['players', 'players.player', 'players.player.tier', 'players.player.team'],
        });
        if (team) return team;
      }
      throw err;
    }
  }

  async getMyTeam(userId: number): Promise<UserTeam> {
    return this.getOrCreateTeam(userId);
  }

  async setFormation(userId: number, dto: SetFormationDto): Promise<UserTeam> {
    if (!VALID_FORMATIONS.includes(dto.formation as any)) {
      throw new BadRequestException(`ფორმაცია უნდა იყოს: ${VALID_FORMATIONS.join(', ')}`);
    }

    const team = await this.getOrCreateTeam(userId);
    const starters = team.players.filter((p) => p.isStarter);

    if (starters.length === 11) {
      this.validateFormationWithPlayers(dto.formation, starters.map((s) => s.player.position));
    }

    team.formation = dto.formation;
    return this.userTeamRepo.save(team);
  }

  async setCaptain(userId: number, dto: SetCaptainDto): Promise<UserTeam> {
    const team = await this.getOrCreateTeam(userId);
    const playerInTeam = team.players.find((p) => p.playerId === dto.playerId);
    if (!playerInTeam) {
      throw new BadRequestException('ეს ფეხბურთელი შენს გუნდში არ არის');
    }
    if (!playerInTeam.isStarter) {
      throw new BadRequestException('კაპიტანი Starter უნდა იყოს');
    }
    team.captainId = dto.playerId;
    return this.userTeamRepo.save(team);
  }

  async setLineup(userId: number, dto: SetLineupDto): Promise<UserTeam> {
    const team = await this.getOrCreateTeam(userId);

    if (team.players.length !== 15) {
      throw new BadRequestException(
        `Lineup-ის დასაყენებლად გუნდში ზუსტად 15 ფეხბ. უნდა გყავდეს. ახლა: ${team.players.length}`,
      );
    }

    const starters = dto.lineup.filter((p) => p.isStarter);
    const subs = dto.lineup.filter((p) => !p.isStarter);

    if (starters.length !== 11) {
      throw new BadRequestException(`Starter-ების რაოდენობა უნდა იყოს 11, გამოგზავნე: ${starters.length}`);
    }
    if (subs.length !== 4) {
      throw new BadRequestException(`Sub-ების რაოდენობა უნდა იყოს 4, გამოგზავნე: ${subs.length}`);
    }

    const teamPlayerMap = new Map(team.players.map((p) => [p.id, p]));

    const starterPositions: PlayerPosition[] = [];
    for (const item of starters) {
      const utp = teamPlayerMap.get(item.id);
      if (!utp) throw new BadRequestException(`UserTeamPlayer ID ${item.id} შენს გუნდში არ არის`);
      starterPositions.push(utp.player.position);
    }

    const gkCount = starterPositions.filter((p) => p === PlayerPosition.GK).length;
    if (gkCount !== 1) {
      throw new BadRequestException(`Starter-ებში ზუსტად 1 GK უნდა იყოს, გამოგზავნე: ${gkCount}`);
    }

    this.validateFormationWithPlayers(team.formation, starterPositions);

    // BUG-M04: only save UTPs that actually changed to reduce unnecessary UPDATE queries
    const changedUtps: UserTeamPlayer[] = [];
    for (const item of dto.lineup) {
      const utp = teamPlayerMap.get(item.id);
      // BUG-008: throw instead of silently skipping invalid IDs
      if (!utp) throw new BadRequestException(`UserTeamPlayer ID ${item.id} შენს გუნდში არ არის`);
      const newIsStarter = item.isStarter;
      const newSubOrder = item.isStarter ? null : (item.subOrder ?? null);
      if (utp.isStarter !== newIsStarter || utp.subOrder !== newSubOrder) {
        utp.isStarter = newIsStarter;
        utp.subOrder = newSubOrder;
        changedUtps.push(utp);
      }
    }

    if (changedUtps.length > 0) {
      await this.utpRepo.save(changedUtps);
    }

    if (team.captainId) {
      const captainInStarters = starters.find((s) => {
        const utp = teamPlayerMap.get(s.id);
        return utp?.playerId === team.captainId;
      });
      if (!captainInStarters) {
        team.captainId = null;
        await this.userTeamRepo.save(team);
      }
    }

    return this.getOrCreateTeam(userId);
  }

  async getHistory(userId: number): Promise<UserTeamHistory[]> {
    return this.historyRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  private validateFormationWithPlayers(formation: string, positions: PlayerPosition[]): void {
    const [defStr, midStr, fwdStr] = formation.split('-');
    const expectedDef = parseInt(defStr);
    const expectedMid = parseInt(midStr);
    const expectedFwd = parseInt(fwdStr);

    const actualGk = positions.filter((p) => p === PlayerPosition.GK).length;
    const actualDef = positions.filter((p) => p === PlayerPosition.DEF).length;
    const actualMid = positions.filter((p) => p === PlayerPosition.MID).length;
    const actualFwd = positions.filter((p) => p === PlayerPosition.FWD).length;

    // BUG-016: also validate exactly 1 GK
    if (actualGk !== 1) {
      throw new BadRequestException(
        `Starter-ებში ზუსტად 1 GK უნდა იყოს, არის: ${actualGk}`,
      );
    }

    if (actualDef !== expectedDef || actualMid !== expectedMid || actualFwd !== expectedFwd) {
      throw new BadRequestException(
        `ფორმაცია ${formation} მოითხოვს: ${expectedDef} DEF, ${expectedMid} MID, ${expectedFwd} FWD. ` +
          `გამოგზავნე: ${actualDef} DEF, ${actualMid} MID, ${actualFwd} FWD`,
      );
    }
  }

  getPositionMax(): Record<PlayerPosition, number> {
    return POSITION_MAX;
  }
}
