import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsDateString } from 'class-validator';
import { MatchStatus } from '../../matches/entities/match.entity';

export class CreateMatchDto {
  @ApiProperty({ description: 'Tournament ID' })
  @IsInt()
  tournamentId: number;

  @ApiProperty({ description: 'Home Team ID' })
  @IsInt()
  homeTeamId: number;

  @ApiProperty({ description: 'Away Team ID' })
  @IsInt()
  awayTeamId: number;

  @ApiPropertyOptional({ description: 'Kickoff timestamp (ISO 8601)', example: '2026-06-12T15:00:00Z' })
  @IsOptional()
  @IsDateString()
  kickoff?: string;

  @ApiPropertyOptional({ enum: MatchStatus, default: MatchStatus.SCHEDULED })
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @ApiPropertyOptional({ description: 'API-Football match ID' })
  @IsOptional()
  @IsInt()
  apiFootballId?: number;
}
