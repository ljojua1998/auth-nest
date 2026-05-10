import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, Min } from 'class-validator';

export class SaveTeamDto {
  @ApiProperty({
    example: [1, 2, 3],
    description: 'სასურველი გუნდის ფეხბურთელების ID-ები (1-15)',
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(15)
  @IsInt({ each: true })
  @Min(1, { each: true })
  playerIds: number[];
}
