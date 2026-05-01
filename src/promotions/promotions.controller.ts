import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { CreatePromoDto } from './dto/create-promo.dto';
import { RedeemPromoDto } from './dto/redeem-promo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Promotions')
@Controller()
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post('promo/redeem')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Promo კოდის გამოყენება' })
  @ApiResponse({ status: 201, description: 'Bonus Coin დაერიცხა' })
  @ApiResponse({ status: 400, description: 'ვადაგასული / ლიმიტი ამოიწურა / უკვე გამოყენებული' })
  @ApiResponse({ status: 404, description: 'კოდი ვერ მოიძებნა' })
  redeem(@Request() req: { user: { id: number } }, @Body() dto: RedeemPromoDto) {
    return this.promotionsService.redeem(req.user.id, dto);
  }

  @Get('promo/my-redemptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ჩემი გამოყენებული Promo კოდები' })
  @ApiResponse({ status: 200, description: 'Redemption ისტორია' })
  getMyRedemptions(@Request() req: { user: { id: number } }) {
    return this.promotionsService.getMyRedemptions(req.user.id);
  }

  @Post('admin/promo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] ახალი Promo კოდის შექმნა' })
  @ApiResponse({ status: 201, description: 'Promo კოდი შეიქმნა' })
  create(@Body() dto: CreatePromoDto) {
    return this.promotionsService.create(dto);
  }

  @Get('admin/promo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] ყველა Promo კოდი' })
  findAll() {
    return this.promotionsService.findAll();
  }

  @Patch('admin/promo/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[Admin] Promo კოდის განახლება' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreatePromoDto>) {
    const { expiresAt, ...rest } = dto;
    const data: Partial<import('./entities/promo-code.entity').PromoCode> = { ...rest };
    if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;
    return this.promotionsService.update(id, data);
  }

  @Delete('admin/promo/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Admin] Promo კოდის წაშლა' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.remove(id);
  }
}
