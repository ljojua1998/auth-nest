import { Controller, Get, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Leaderboard')
@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('global')
  @ApiOperation({ summary: 'Global Leaderboard (ყველა ეტაპის ჯამი) — Top 100 + my rank' })
  @ApiResponse({ status: 200, description: 'Global leaderboard' })
  getGlobal(@Request() req: { user: { id: number } }) {
    return this.leaderboardService.getGlobal(req.user.id);
  }

  @Get(':tournamentId')
  @ApiOperation({ summary: 'ეტაპის Leaderboard — Top 100 + my rank' })
  @ApiResponse({ status: 200, description: 'Leaderboard' })
  getLeaderboard(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.leaderboardService.getLeaderboard(tournamentId, req.user.id);
  }
}
