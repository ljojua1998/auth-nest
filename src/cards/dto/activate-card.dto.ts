import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ActivateCardDto {
  @ApiProperty({ example: 1, description: 'Tournament ID (ეტაპი, რომელზეც Card-ს ააქტივებ)' })
  @IsInt()
  @Min(1)
  tournamentId: number;
}
