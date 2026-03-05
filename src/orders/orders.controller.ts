import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CheckoutDto } from './dto/checkout.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // POST /orders/checkout — კალათიდან შეკვეთის გაფორმება
  @Post('checkout')
  checkout(
    @Request() req: { user: { id: number } },
    @Body() dto: CheckoutDto,
  ) {
    return this.ordersService.checkout(req.user.id, dto);
  }

  // GET /orders — ჩემი ყველა შეკვეთა
  @Get()
  getMyOrders(@Request() req: { user: { id: number } }) {
    return this.ordersService.getMyOrders(req.user.id);
  }

  // GET /orders/:id — კონკრეტული შეკვეთის დეტალები
  @Get(':id')
  getOrderById(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.getOrderById(id, req.user.id);
  }
}
