import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PlayersService } from './players.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { FilterPlayersDto } from './dto/filter-players.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Players')
@Controller()
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get('players')
  @ApiOperation({ summary: 'ყველა ფეხბურთელი (filters: position, tierId, teamId, search)' })
  @ApiResponse({ status: 200, description: 'ფეხბურთელების სია' })
  findAll(@Query() filters: FilterPlayersDto) {
    return this.playersService.findAll(filters);
  }

  @Get('players/:id')
  @ApiOperation({ summary: 'ფეხბურთელის დეტალები' })
  @ApiResponse({ status: 200, description: 'ფეხბურთელი' })
  @ApiResponse({ status: 404, description: 'ფეხბურთელი ვერ მოიძებნა' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.playersService.findById(id);
  }

  @Get('players/:id/stats')
  @ApiOperation({ summary: 'ფეხბ.-ის მატჩ-სტატისტიკა (ყველა მატჩი)' })
  @ApiResponse({ status: 200, description: 'სტატისტიკა' })
  @ApiResponse({ status: 404, description: 'ფეხბურთელი ვერ მოიძებნა' })
  getStats(@Param('id', ParseIntPipe) id: number) {
    return this.playersService.getPlayerStats(id);
  }

  @Post('admin/players/seed-top5')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] ESP/BRA/ENG/ARG/GER ფეხბ. seed API-Football data-დან' })
  @ApiResponse({ status: 201, description: 'Seed დასრულდა' })
  seedTop5() {
    return this.playersService.seedTop5Teams();
  }

  @Post('admin/players')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] ახალი ფეხბურთელის დამატება' })
  @ApiResponse({ status: 201, description: 'ფეხბურთელი შეიქმნა' })
  create(@Body() dto: CreatePlayerDto) {
    return this.playersService.create(dto);
  }

  @Patch('admin/players/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] ფეხბურთელის განახლება (Tier, სახელი...)' })
  @ApiResponse({ status: 200, description: 'ფეხბურთელი განახლდა' })
  @ApiResponse({ status: 404, description: 'ფეხბურთელი ვერ მოიძებნა' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlayerDto,
  ) {
    return this.playersService.update(id, dto);
  }
}
