import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class RedeemPromoDto {
  @ApiProperty({ example: 'WORLDCUP2026' })
  @IsString()
  @MaxLength(50)
  code: string;
}
