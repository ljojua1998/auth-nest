import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  Length,
  Matches,
} from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: 'Brazil' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'BRA', description: '3-სიმბოლოიანი კოდი' })
  @IsString()
  @Length(3, 3)
  code: string;

  @ApiPropertyOptional({ example: 'https://...flag.png' })
  @IsOptional()
  @IsString()
  flag?: string;

  @ApiPropertyOptional({ example: 'A', description: 'ჯგუფი A-H' })
  @IsOptional()
  @IsString()
  @Length(1, 1)
  @Matches(/^[A-H]$/, { message: 'ჯგუფი A-H შუალედში უნდა იყოს' })
  group?: string;
}
