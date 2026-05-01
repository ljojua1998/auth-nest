import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { ActivateCardDto } from './dto/activate-card.dto';
import { CardType } from './entities/user-card.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Cards')
@Controller('cards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get()
  @ApiOperation({ summary: 'ჩემი Cards (Triple Captain / Wildcard / Limitless)' })
  @ApiResponse({ status: 200, description: 'Cards სია + used სტატუსი' })
  getMyCards(@Request() req: { user: { id: number } }) {
    return this.cardsService.getMyCards(req.user.id);
  }

  @Post('triple-captain')
  @ApiOperation({ summary: 'Triple Captain Card აქტივაცია (x3 ქულა კაპიტნისთვის)' })
  @ApiResponse({ status: 201, description: 'Card გააქტიურდა' })
  @ApiResponse({ status: 400, description: 'Card უკვე გამოყენებულია' })
  activateTripleCaptain(
    @Request() req: { user: { id: number } },
    @Body() dto: ActivateCardDto,
  ) {
    return this.cardsService.activateCard(req.user.id, CardType.TRIPLE_CAPTAIN, dto);
  }

  @Post('wildcard')
  @ApiOperation({ summary: 'Wildcard Card აქტივაცია (ულიმიტო ცვლა ერთ ეტაპზე)' })
  @ApiResponse({ status: 201, description: 'Card გააქტიურდა' })
  @ApiResponse({ status: 400, description: 'Card უკვე გამოყენებულია' })
  activateWildcard(
    @Request() req: { user: { id: number } },
    @Body() dto: ActivateCardDto,
  ) {
    return this.cardsService.activateCard(req.user.id, CardType.WILDCARD, dto);
  }

  @Post('limitless')
  @ApiOperation({ summary: 'Limitless Card აქტივაცია (Coin-ის გარეშე ნებისმიერი ფეხბ.)' })
  @ApiResponse({ status: 201, description: 'Card გააქტიურდა' })
  @ApiResponse({ status: 400, description: 'Card უკვე გამოყენებულია' })
  activateLimitless(
    @Request() req: { user: { id: number } },
    @Body() dto: ActivateCardDto,
  ) {
    return this.cardsService.activateCard(req.user.id, CardType.LIMITLESS, dto);
  }
}
