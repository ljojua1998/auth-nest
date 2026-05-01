import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { TournamentStage, TournamentStatus } from '../entities/tournament.entity';

export class CreateTournamentDto {
  @ApiProperty({ example: 'Group Stage' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: TournamentStage })
  @IsEnum(TournamentStage)
  stage: TournamentStage;

  @ApiPropertyOptional({ enum: TournamentStatus })
  @IsOptional()
  @IsEnum(TournamentStatus)
  status?: TournamentStatus;

  @ApiPropertyOptional({ example: '2026-06-11T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-26T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
