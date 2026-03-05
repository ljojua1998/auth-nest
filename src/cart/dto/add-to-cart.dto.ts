import { IsInt, IsPositive, IsOptional, Min } from 'class-validator';

export class AddToCartDto {
  @IsInt({ message: 'productId მთელი რიცხვი უნდა იყოს' })
  @IsPositive({ message: 'productId დადებითი უნდა იყოს' })
  productId: number;

  @IsOptional()
  @IsInt({ message: 'quantity მთელი რიცხვი უნდა იყოს' })
  @Min(1, { message: 'quantity მინიმუმ 1 უნდა იყოს' })
  quantity?: number;
}
