import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RedeemPromoDto {
  @ApiProperty({ example: 'WORLDCUP2026' })
  @IsString()
  // BUG-H06: reject empty string promo codes
  @IsNotEmpty()
  @MaxLength(50)
  code: string;
}
