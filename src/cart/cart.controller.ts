import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Request() req: { user: { id: number } }) {
    return this.cartService.getCart(req.user.id);
  }

  @Post('add')
  addToCart(
    @Request() req: { user: { id: number } },
    @Body() dto: AddToCartDto,
  ) {
    return this.cartService.addToCart(req.user.id, dto);
  }

  @Patch('update/:id')
  updateQuantity(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCartDto,
  ) {
    return this.cartService.updateQuantity(id, req.user.id, dto);
  }

  @Delete('remove/:id')
  removeFromCart(
    @Request() req: { user: { id: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cartService.removeFromCart(id, req.user.id);
  }

  @Delete('clear')
  clearCart(@Request() req: { user: { id: number } }) {
    return this.cartService.clearCart(req.user.id);
  }
}
