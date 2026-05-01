import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, Min } from 'class-validator';
import { MatchStatus } from '../../matches/entities/match.entity';

export class UpdateMatchStatusDto {
  @ApiProperty({ enum: MatchStatus })
  @IsEnum(MatchStatus)
  status: MatchStatus;
}

export class IdParamDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  id: number;
}
