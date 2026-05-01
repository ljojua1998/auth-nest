import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class BuySellDto {
  @ApiProperty({ example: 1, description: 'ფეხბურთელის ID' })
  @IsInt()
  @Min(1)
  playerId: number;
}
