import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { PlayerPosition } from '../entities/player.entity';

export class FilterPlayersDto {
  @ApiPropertyOptional({ enum: PlayerPosition })
  @IsOptional()
  @IsEnum(PlayerPosition)
  position?: PlayerPosition;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsInt()
  @Min(1)
  tierId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value))
  @IsInt()
  @Min(1)
  teamId?: number;

  @ApiPropertyOptional({ example: 'Messi' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
