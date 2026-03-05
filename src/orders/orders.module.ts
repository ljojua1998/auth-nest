import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [
    // Order და OrderItem — ორივე Entity-ს Repository ჭირდება
    TypeOrmModule.forFeature([Order, OrderItem]),

    // CartModule — CartService-ს იმპორტავს (checkout-ისას კალათის წამოღება)
    // მუშაობს რადგან CartModule-ში exports: [CartService] გვაქვს
    CartModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
