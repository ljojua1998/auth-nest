import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';

// OrderItem = შეკვეთაში ერთი ნივთი
// მაგ: "ჯაკეტი x2, ფასი ყიდვისას: $55.99"
@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  // რომელ Order-ს ეკუთვნის
  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  order: Order;

  @Column()
  orderId: number;

  // რომელი პროდუქტია
  // eager: true — OrderItem-თან ერთად Product-ის ინფოც მოვა (სახელი, სურათი)
  @ManyToOne(() => Product, { eager: true })
  product: Product;

  @Column()
  productId: number;

  // რამდენი ცალი
  @Column()
  quantity: number;

  // ყიდვის დროინდელი ფასი!
  // რატომ არა product.price?
  // — პროდუქტის ფასი შეიძლება შეიცვალოს (მაგ: $55.99 → $49.99)
  // — მაგრამ შეკვეთის ისტორიაში ყიდვის დროინდელი ფასი უნდა ჩანდეს
  // — ეს ყველა e-commerce სისტემაში ასეა (Amazon, eBay და ა.შ.)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceAtPurchase: number;
}
