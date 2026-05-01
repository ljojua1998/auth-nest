import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  MaxLength,
  Min,
} from 'class-validator';
import { PlayerPosition } from '../entities/player.entity';

export class UpdatePlayerDto {
  @ApiPropertyOptional({ example: 'Lionel Messi' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: PlayerPosition })
  @IsOptional()
  @IsEnum(PlayerPosition)
  position?: PlayerPosition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  tierId?: number;
}
