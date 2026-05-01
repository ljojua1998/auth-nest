import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  MaxLength,
  Min,
} from 'class-validator';
import { PlayerPosition } from '../entities/player.entity';

export class CreatePlayerDto {
  @ApiProperty({ example: 'Lionel Messi' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: PlayerPosition, example: PlayerPosition.FWD })
  @IsEnum(PlayerPosition)
  position: PlayerPosition;

  @ApiPropertyOptional({ example: 'https://...photo.png' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional({ example: 123456 })
  @IsOptional()
  @IsInt()
  @Min(1)
  apiFootballId?: number;

  @ApiProperty({ example: 1, description: 'ნაკრების ID' })
  @IsInt()
  @Min(1)
  teamId: number;

  @ApiProperty({ example: 1, description: 'Tier-ის ID' })
  @IsInt()
  @Min(1)
  tierId: number;
}
