import {
  Controller,
  Post,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UpdateMatchStatusDto } from './dto/match-status.dto';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpsertMatchStatDto } from './dto/upsert-match-stat.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Admin Operations')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('open-marketplace')
  @ApiOperation({ summary: '[Admin] Marketplace გახსნა' })
  @ApiResponse({ status: 201, description: 'Marketplace გაიხსნა' })
  openMarketplace() {
    return this.adminService.openMarketplace();
  }

  @Post('close-marketplace')
  @ApiOperation({ summary: '[Admin] Marketplace დახურვა' })
  @ApiResponse({ status: 201, description: 'Marketplace დაიხურა' })
  closeMarketplace() {
    return this.adminService.closeMarketplace();
  }

  @Post('calculate-points/:matchId')
  @ApiOperation({ summary: '[Admin] ქულების გამოთვლა match-ისთვის' })
  @ApiResponse({ status: 201, description: 'ქულები გამოითვალა' })
  calculatePoints(@Param('matchId', ParseIntPipe) matchId: number) {
    return this.adminService.calculatePoints(matchId);
  }

  @Post('snapshot-leaderboard/:tournamentId')
  @ApiOperation({ summary: '[Admin] Leaderboard-ის snapshot (ეტაპის ბოლოს)' })
  @ApiResponse({ status: 201, description: 'Snapshot შეიქმნა' })
  snapshotLeaderboard(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
  ) {
    return this.adminService.snapshotLeaderboard(tournamentId);
  }

  @Post('distribute-prizes/:tournamentId')
  @ApiOperation({ summary: '[Admin] Coin Prize-ის დარიცხვა Top 5-ზე' })
  @ApiResponse({ status: 201, description: 'Prize დაერიცხა' })
  distributePrizes(@Param('tournamentId', ParseIntPipe) tournamentId: number) {
    return this.adminService.distributePrizes(tournamentId);
  }

  @Post('process-elimination/:teamId')
  @ApiOperation({ summary: '[Admin] გავარდნილი ნაკრების ფეხბ. ამოშლა + Coin refund' })
  @ApiResponse({ status: 201, description: 'ამოიშალა, Coin დაბრუნდა' })
  processElimination(@Param('teamId', ParseIntPipe) teamId: number) {
    return this.adminService.processElimination(teamId);
  }

  @Post('activate-tournament/:tournamentId')
  @ApiOperation({ summary: '[Admin] Tournament-ის გააქტიურება' })
  activateTournament(@Param('tournamentId', ParseIntPipe) tournamentId: number) {
    return this.adminService.activateTournament(tournamentId);
  }

  @Post('complete-tournament/:tournamentId')
  @ApiOperation({ summary: '[Admin] Tournament-ის დასრულება' })
  completeTournament(@Param('tournamentId', ParseIntPipe) tournamentId: number) {
    return this.adminService.completeTournament(tournamentId);
  }

  @Post('match-status/:matchId')
  @ApiOperation({ summary: '[Admin] Match სტატუსის განახლება (live/finished...)' })
  updateMatchStatus(
    @Param('matchId', ParseIntPipe) matchId: number,
    @Body() dto: UpdateMatchStatusDto,
  ) {
    return this.adminService.updateMatchStatus(matchId, dto.status);
  }

  @Post('matches')
  @ApiOperation({ summary: '[Admin] მატჩის ხელით შექმნა' })
  @ApiResponse({ status: 201, description: 'მატჩი შეიქმნა' })
  createMatch(@Body() dto: CreateMatchDto) {
    return this.adminService.createMatch(dto);
  }

  @Post('matches/:matchId/stats')
  @ApiOperation({ summary: '[Admin] ფეხბ. სტატისტიკის დამატება/განახლება' })
  @ApiResponse({ status: 201, description: 'სტატისტიკა შეინახა' })
  upsertMatchStat(
    @Param('matchId', ParseIntPipe) matchId: number,
    @Body() dto: UpsertMatchStatDto,
  ) {
    return this.adminService.upsertMatchStat(matchId, dto);
  }
}
