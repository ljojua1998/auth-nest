import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { VALID_FORMATIONS } from '../entities/user-team.entity';

export class SetFormationDto {
  @ApiProperty({
    example: '4-3-3',
    description: `ნებადართული ფორმაციები: ${VALID_FORMATIONS.join(', ')}`,
  })
  @IsIn(VALID_FORMATIONS, {
    message: `ფორმაცია უნდა იყოს: ${VALID_FORMATIONS.join(', ')}`,
  })
  formation: string;
}
