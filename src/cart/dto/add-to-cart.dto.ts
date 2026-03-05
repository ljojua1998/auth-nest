import { IsInt, IsPositive, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ example: 3, description: 'პროდუქტის ID' })
  @IsInt({ message: 'productId მთელი რიცხვი უნდა იყოს' })
  @IsPositive({ message: 'productId დადებითი უნდა იყოს' })
  productId: number;

  @ApiProperty({ example: 2, description: 'რაოდენობა (default: 1)', required: false })
  @IsOptional()
  @IsInt({ message: 'quantity მთელი რიცხვი უნდა იყოს' })
  @Min(1, { message: 'quantity მინიმუმ 1 უნდა იყოს' })
  quantity?: number;
}
