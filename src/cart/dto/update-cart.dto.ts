import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartDto {
  @ApiProperty({ example: 5, description: 'ახალი რაოდენობა (მინიმუმ 1)' })
  @IsInt({ message: 'quantity მთელი რიცხვი უნდა იყოს' })
  @Min(1, { message: 'quantity მინიმუმ 1 უნდა იყოს' })
  quantity: number;
}
