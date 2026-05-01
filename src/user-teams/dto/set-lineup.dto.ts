import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';

export class LineupPlayerDto {
  @ApiProperty({ example: 5, description: 'UserTeamPlayer ID' })
  @IsInt()
  @Min(1)
  id: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isStarter: boolean;

  @ApiProperty({ example: 1, nullable: true, description: 'Sub priority 1-4 (სუბ-ებისთვის)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  subOrder?: number | null;
}

export class SetLineupDto {
  @ApiProperty({ type: [LineupPlayerDto] })
  @IsArray()
  @ArrayMinSize(15)
  @ArrayMaxSize(15)
  @ValidateNested({ each: true })
  @Type(() => LineupPlayerDto)
  lineup: LineupPlayerDto[];
}
