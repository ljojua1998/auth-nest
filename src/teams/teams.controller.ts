import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { PlayersService } from '../players/players.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Teams')
@Controller()
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly playersService: PlayersService,
  ) {}

  @Get('teams')
  @ApiOperation({ summary: 'ყველა ნაკრების სია' })
  @ApiResponse({ status: 200, description: 'ნაკრებების სია' })
  findAll() {
    return this.teamsService.findAll();
  }

  @Get('teams/:id')
  @ApiOperation({ summary: 'ნაკრების დეტალები' })
  @ApiResponse({ status: 200, description: 'ნაკრები' })
  @ApiResponse({ status: 404, description: 'ნაკრები ვერ მოიძებნა' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teamsService.findById(id);
  }

  @Get('teams/:id/players')
  @ApiOperation({ summary: 'ნაკრების ფეხბურთელები' })
  @ApiResponse({ status: 200, description: 'ფეხბურთელების სია' })
  @ApiResponse({ status: 404, description: 'ნაკრები ვერ მოიძებნა' })
  async getTeamPlayers(@Param('id', ParseIntPipe) id: number) {
    await this.teamsService.findById(id);
    return this.playersService.findByTeam(id);
  }

  @Post('admin/teams')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] ახალი ნაკრების დამატება' })
  @ApiResponse({ status: 201, description: 'ნაკრები შეიქმნა' })
  create(@Body() dto: CreateTeamDto) {
    return this.teamsService.create(dto);
  }

  @Post('admin/teams/seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] 32 World Cup ნაკრების seed' })
  @ApiResponse({ status: 201, description: 'Seed წარმატებით შესრულდა' })
  seed() {
    return this.teamsService.seed();
  }

  @Post('admin/teams/:id/eliminate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] ნაკრების eliminated მონიშვნა' })
  @ApiResponse({ status: 200, description: 'ნაკრები eliminated-ად მონიშნა' })
  eliminate(@Param('id', ParseIntPipe) id: number) {
    return this.teamsService.markEliminated(id);
  }
}
