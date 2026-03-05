import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from './entities/cart-item.entity';
import { ProductsService } from '../products/products.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private cartRepository: Repository<CartItem>,
    private productsService: ProductsService,
  ) {}
  async getCart(userId: number) {
    const items = await this.cartRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const totalPrice = items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      items,
      totalPrice: Math.round(totalPrice * 100) / 100, // 134.28000000001 → 134.28
      totalItems,
    };
  }

  async addToCart(userId: number, dto: AddToCartDto) {
    const { productId, quantity = 1 } = dto;

    await this.productsService.findOne(productId);

    const existingItem = await this.cartRepository.findOne({
      where: { userId, productId },
    });

    if (existingItem) {

      existingItem.quantity += quantity;
      await this.cartRepository.save(existingItem);
      return {
        message: 'პროდუქტის რაოდენობა განახლდა',
        cartItem: existingItem,
      };
    }

    const cartItem = this.cartRepository.create({
      userId,
      productId,
      quantity,
    });
    const saved = await this.cartRepository.save(cartItem);

    const fullItem = await this.cartRepository.findOne({
      where: { id: saved.id },
    });

    return {
      message: 'პროდუქტი კალათაში დაემატა',
      cartItem: fullItem,
    };
  }

  async updateQuantity(cartItemId: number, userId: number, dto: UpdateCartDto) {
    const item = await this.cartRepository.findOne({
      where: { id: cartItemId, userId },
    });

    if (!item) {
      throw new NotFoundException('ეს ნივთი შენს კალათაში არ არის');
    }

    item.quantity = dto.quantity;
    await this.cartRepository.save(item);

    return {
      message: 'რაოდენობა განახლდა',
      cartItem: item,
    };
  }

  async removeFromCart(cartItemId: number, userId: number) {
    const item = await this.cartRepository.findOne({
      where: { id: cartItemId, userId },
    });

    if (!item) {
      throw new NotFoundException('ეს ნივთი შენს კალათაში არ არის');
    }

    await this.cartRepository.remove(item);
    return { message: 'ნივთი კალათიდან წაიშალა' };
  }

  async clearCart(userId: number) {
    await this.cartRepository.delete({ userId });
    return { message: 'კალათა გასუფთავდა' };
  }
}
