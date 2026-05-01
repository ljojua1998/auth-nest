import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Tournaments')
@Controller()
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get('tournaments')
  @ApiOperation({ summary: 'ყველა ეტაპი (Group / R32 / R16...)' })
  @ApiResponse({ status: 200, description: 'ეტაპების სია' })
  findAll() {
    return this.tournamentsService.findAll();
  }

  @Get('tournaments/current')
  @ApiOperation({ summary: 'მიმდინარე აქტიური ეტაპი' })
  @ApiResponse({ status: 200, description: 'აქტიური ეტაპი ან null' })
  getCurrent() {
    return this.tournamentsService.getCurrent();
  }

  @Get('tournaments/:id')
  @ApiOperation({ summary: 'ეტაპის დეტალები' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentsService.findById(id);
  }

  @Post('admin/tournaments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] ახალი ეტაპის შექმნა' })
  create(@Body() dto: CreateTournamentDto) {
    return this.tournamentsService.create(dto);
  }
}
