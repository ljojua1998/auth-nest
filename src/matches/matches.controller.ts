import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MatchesService } from './matches.service';

@ApiTags('Matches')
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  @ApiOperation({ summary: 'ყველა მატჩი (kickoff ASC)' })
  @ApiResponse({ status: 200, description: 'მატჩების სია' })
  findAll() {
    return this.matchesService.findAll();
  }

  @Get('live')
  @ApiOperation({ summary: 'Live მატჩები' })
  @ApiResponse({ status: 200, description: 'Live მატჩები' })
  findLive() {
    return this.matchesService.findLive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'მატჩის დეტალები' })
  @ApiResponse({ status: 200, description: 'მატჩი' })
  @ApiResponse({ status: 404, description: 'მატჩი ვერ მოიძებნა' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.matchesService.findById(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'მატჩის სტატისტიკა (ყველა ფეხბ.)' })
  @ApiResponse({ status: 200, description: 'სტატისტიკა' })
  getStats(@Param('id', ParseIntPipe) id: number) {
    return this.matchesService.getMatchStats(id);
  }
}
