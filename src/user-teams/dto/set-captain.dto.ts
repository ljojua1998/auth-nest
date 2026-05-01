import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class SetCaptainDto {
  @ApiProperty({ example: 5, description: 'ფეხბურთელის ID (გუნდში უნდა იყოს)' })
  @IsInt()
  @Min(1)
  playerId: number;
}
