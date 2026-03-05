import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartService } from '../cart/cart.service';
import { CheckoutDto } from './dto/checkout.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,

    // CartService — კალათის წამოღება და გასუფთავება
    private cartService: CartService,

    // DataSource — Transaction-ისთვის გვჭირდება
    // DataSource = TypeORM-ის DB კავშირის მთავარი ობიექტი
    // მისით QueryRunner-ს ვქმნით რომელიც Transaction-ს მართავს
    private dataSource: DataSource,
  ) {}

  // ============================
  // CHECKOUT — ყიდვა (Transaction-ით)
  // ============================
  async checkout(userId: number, dto: CheckoutDto) {
    // 1. ბარათით გადახდის ბლოკი
    if (dto.paymentMethod === 'card') {
      throw new BadRequestException(
        'ბარათით გადახდა დროებით მიუწვდომელია',
      );
    }

    // 2. კალათის წამოღება
    const cart = await this.cartService.getCart(userId);
    if (cart.items.length === 0) {
      throw new BadRequestException('კალათა ცარიელია');
    }

    // 3. ჯამის დათვლა (cart.totalPrice უკვე დათვლილია CartService-ში)
    const totalPrice = cart.totalPrice;

    // ============================
    // TRANSACTION START
    // ============================
    // QueryRunner — Transaction-ის მართვის ინსტრუმენტი
    // startTransaction() → ყველა ოპერაცია "დროებითია"
    // commitTransaction() → ყველაფერი შეინახება
    // rollbackTransaction() → ყველაფერი გაუქმდება
    //
    // Angular-ში forkJoin()-ის ანალოგია:
    // forkJoin([req1, req2, req3]) — ან ყველა წარმატებით, ან error
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 4. იუზერის ბალანსის შემოწმება და განახლება
      // queryRunner.manager — Transaction-ის შიგნით DB ოპერაციები
      // ნორმალური repository-ს ნაცვლად queryRunner.manager-ს ვიყენებთ
      // რომ ყველაფერი ერთ Transaction-ში იყოს
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) {
        throw new BadRequestException('მომხმარებელი ვერ მოიძებნა');
      }

      const currentBalance = Number(user.balance);
      if (currentBalance < totalPrice) {
        throw new BadRequestException(
          `არასაკმარისი ბალანსი. გაქვთ: $${currentBalance}, საჭიროა: $${totalPrice}`,
        );
      }

      // 5. Order შექმნა
      const order = queryRunner.manager.create(Order, {
        userId,
        totalPrice,
        status: 'completed',
        paymentMethod: dto.paymentMethod,
        // cascade: true-ს გამო items-იც შეინახება Order-თან ერთად
        items: cart.items.map((cartItem) =>
          queryRunner.manager.create(OrderItem, {
            productId: cartItem.productId,
            quantity: cartItem.quantity,
            // priceAtPurchase — ყიდვის დროინდელი ფასი!
            priceAtPurchase: Number(cartItem.product.price),
          }),
        ),
      });

      const savedOrder = await queryRunner.manager.save(Order, order);

      // 6. ბალანსის განახლება
      const newBalance = currentBalance - totalPrice;
      await queryRunner.manager.update(User, userId, { balance: newBalance });

      // 7. კალათის გასუფთავება
      // CartService.clearCart()-ს ვერ ვიყენებთ რადგან ის სხვა connection-ზეა
      // Transaction-ის შიგნით queryRunner.manager უნდა გამოვიყენოთ
      await queryRunner.manager.delete('cart_items', { userId });

      // ყველაფერი წარმატებით → COMMIT
      await queryRunner.commitTransaction();

      return {
        message: 'შეკვეთა წარმატებით გაფორმდა',
        order: savedOrder,
        remainingBalance: newBalance,
      };
    } catch (error) {
      // რამე ჩაფეილდა → ROLLBACK (ყველაფერი უკან)
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // QueryRunner-ის გათავისუფლება (მეხსიერების გაწმენდა)
      await queryRunner.release();
    }
  }

  // ============================
  // GET MY ORDERS — ჩემი შეკვეთები
  // ============================
  async getMyOrders(userId: number) {
    return this.ordersRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      // eager: true (entity-ში) → items + products ავტომატურად მოყვება
    });
  }

  // ============================
  // GET ORDER BY ID — კონკრეტული შეკვეთა
  // ============================
  async getOrderById(orderId: number, userId: number) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId, userId }, // userId — სხვის შეკვეთას ვერ ნახავს
    });

    if (!order) {
      throw new NotFoundException('შეკვეთა ვერ მოიძებნა');
    }

    return order;
  }
}
