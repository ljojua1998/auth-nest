import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { BuySellDto } from './dto/buy-sell.dto';
import { FilterPlayersDto } from '../players/dto/filter-players.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Marketplace')
@Controller('market')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('status')
  @ApiOperation({ summary: 'Marketplace სტატუსი (ღია/დახურული)' })
  @ApiResponse({ status: 200, description: 'სტატუსი' })
  getStatus() {
    return this.marketplaceService.getStatus();
  }

  @Get()
  @ApiOperation({ summary: 'Marketplace-ზე ხელმისაწვდომი ფეხბურთელები' })
  @ApiResponse({ status: 200, description: 'ფეხბურთელების სია' })
  getPlayers(@Query() filters: FilterPlayersDto) {
    return this.marketplaceService.getAvailablePlayers(filters);
  }

  @Post('buy')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ფეხბურთელის ყიდვა (Marketplace ღია უნდა იყოს)' })
  @ApiResponse({ status: 201, description: 'ფეხბ. გუნდს დაემატა' })
  @ApiResponse({ status: 400, description: 'არასაკმარისი Coin / გუნდი სავსე / პოზიციის ლიმიტი' })
  @ApiResponse({ status: 403, description: 'Marketplace დახურულია' })
  buy(@Request() req: { user: { id: number } }, @Body() dto: BuySellDto) {
    return this.marketplaceService.buy(req.user.id, dto.playerId);
  }

  @Post('sell')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ფეხბურთელის გაყიდვა (Marketplace ღია უნდა იყოს)' })
  @ApiResponse({ status: 201, description: 'ფეხბ. გაიყიდა, Coin დაბრუნდა' })
  @ApiResponse({ status: 400, description: 'ფეხბ. გუნდში არ არის' })
  @ApiResponse({ status: 403, description: 'Marketplace დახურულია' })
  sell(@Request() req: { user: { id: number } }, @Body() dto: BuySellDto) {
    return this.marketplaceService.sell(req.user.id, dto.playerId);
  }
}
