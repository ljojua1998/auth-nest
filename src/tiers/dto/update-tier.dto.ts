import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, Min, MaxLength, IsOptional } from 'class-validator';

export class UpdateTierDto {
  @ApiPropertyOptional({ example: 'Superstar' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  coinPrice?: number;
}
