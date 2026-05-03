import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  IsDateString,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { PromoType } from '../entities/promo-code.entity';

export class CreatePromoDto {
  @ApiProperty({ example: 'WORLDCUP2026' })
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, { message: 'კოდი შეიძლება შეიცავდეს მხოლოდ დიდ ასოებს, ციფრებს, - და _' })
  code: string;

  @ApiPropertyOptional({ enum: PromoType, default: PromoType.CAMPAIGN })
  @IsOptional()
  @IsEnum(PromoType)
  type?: PromoType;

  @ApiProperty({ example: 50000 })
  @IsInt()
  @Min(1)
  @Max(50000000)
  bonusCoins: number;

  @ApiPropertyOptional({ example: 100, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number | null;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  onePerUser?: boolean;

  @ApiPropertyOptional({ example: '2026-07-15T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
