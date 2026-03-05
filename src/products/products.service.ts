import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}
  async seed() {
    const existingCount = await this.productsRepository.count();
    if (existingCount > 0) {
      throw new BadRequestException(
        `პროდუქტები უკვე ჩაწერილია DB-ში (${existingCount} ცალი)`,
      );
    }
    const response = await fetch('https://fakestoreapi.com/products');
    const data = (await response.json()) as Array<{
      title: string;
      price: number;
      description: string;
      category: string;
      image: string;
      rating: { rate: number; count: number };
    }>;
    const products = data.map((item) => {
      return this.productsRepository.create({
        title: item.title,
        price: item.price,
        description: item.description,
        category: item.category,
        image: item.image,
        ratingRate: item.rating.rate,
        ratingCount: item.rating.count,
      });
    });
    await this.productsRepository.save(products);

    return {
      message: `${products.length} პროდუქტი წარმატებით ჩაიწერა DB-ში`,
    };
  }

  async findAll() {
    return this.productsRepository.find();
  }

  async findOne(id: number) {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new BadRequestException('პროდუქტი ვერ მოიძებნა');
    }
    return product;
  }

  async getCategories(): Promise<string[]> {
    const products = await this.productsRepository
      .createQueryBuilder('product')
      .select('DISTINCT product.category', 'category')
      .getRawMany();
    return products.map((p: { category: string }) => p.category);
  }

  async findByCategory(category: string) {
    return this.productsRepository.find({ where: { category } });
  }
}
