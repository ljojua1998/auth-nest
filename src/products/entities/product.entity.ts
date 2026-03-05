import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'text' })
  description: string;

  @Column()
  category: string;

  @Column()
  image: string;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0 })
  ratingRate: number;

  @Column({ default: 0 })
  ratingCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
