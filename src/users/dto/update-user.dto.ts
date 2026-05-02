import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Giorgi Beridze' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(64)
  name?: string;
}
