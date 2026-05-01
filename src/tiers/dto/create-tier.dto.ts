import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, Min, MaxLength } from 'class-validator';

export class CreateTierDto {
  @ApiProperty({ example: 'Superstar', description: 'Tier-ის სახელი' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 150000, description: 'Tier-ის ფასი Coin-ებში' })
  @IsInt()
  @Min(1)
  coinPrice: number;
}
