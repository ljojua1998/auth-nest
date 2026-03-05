import { Controller, Get, Post, Param, ParseIntPipe } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('seed')
  seed() {
    return this.productsService.seed();
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get('categories')
  getCategories() {
    return this.productsService.getCategories();
  }

  @Get('category/:category')
  findByCategory(@Param('category') category: string) {
    return this.productsService.findByCategory(category);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }
}
