import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserTeamsService } from './user-teams.service';
import { SetFormationDto } from './dto/set-formation.dto';
import { SetCaptainDto } from './dto/set-captain.dto';
import { SetLineupDto } from './dto/set-lineup.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('My Team')
@Controller('my-team')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserTeamsController {
  constructor(private readonly userTeamsService: UserTeamsService) {}

  @Get()
  @ApiOperation({ summary: 'ჩემი Fantasy გუნდი (15 ფეხბ. + formation + captain)' })
  @ApiResponse({ status: 200, description: 'გუნდი' })
  getMyTeam(@Request() req: { user: { id: number } }) {
    return this.userTeamsService.getMyTeam(req.user.id);
  }

  @Post('formation')
  @ApiOperation({ summary: 'ფორმაციის შეცვლა (3-4-3, 4-3-3 ...)' })
  @ApiResponse({ status: 201, description: 'ფორმაცია განახლდა' })
  setFormation(
    @Request() req: { user: { id: number } },
    @Body() dto: SetFormationDto,
  ) {
    return this.userTeamsService.setFormation(req.user.id, dto);
  }

  @Post('captain')
  @ApiOperation({ summary: 'კაპიტნის არჩევა (Starter-ებიდან)' })
  @ApiResponse({ status: 201, description: 'კაპიტანი განახლდა' })
  setCaptain(
    @Request() req: { user: { id: number } },
    @Body() dto: SetCaptainDto,
  ) {
    return this.userTeamsService.setCaptain(req.user.id, dto);
  }

  @Post('lineup')
  @ApiOperation({ summary: 'Starter/Sub განლაგება (15 ელემენტი)' })
  @ApiResponse({ status: 201, description: 'Lineup განახლდა' })
  setLineup(
    @Request() req: { user: { id: number } },
    @Body() dto: SetLineupDto,
  ) {
    return this.userTeamsService.setLineup(req.user.id, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'ყიდვა/გაყიდვის ისტორია (ბოლო 50)' })
  @ApiResponse({ status: 200, description: 'Transfer ისტორია' })
  getHistory(@Request() req: { user: { id: number } }) {
    return this.userTeamsService.getHistory(req.user.id);
  }
}
