import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {

  @ApiProperty({ example: 'Lasha', description: 'მომხმარებლის სახელი' })
  @IsString()
  @IsNotEmpty({ message: 'სახელი სავალდებულოა' })
  @MaxLength(64)
  name: string;

  @ApiProperty({ example: 'lasha@test.com', description: 'ვალიდური email მისამართი' })
  @IsEmail({}, { message: 'არასწორი email ფორმატი' })
  email: string;

  @ApiProperty({ example: '123456', description: 'პაროლი (მინიმუმ 6 სიმბოლო)' })
  @IsString()
  @MinLength(6, { message: 'პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს' })
  @MaxLength(128)
  password: string;
}
